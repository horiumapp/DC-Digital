import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webcrypto } from 'crypto';

// Garantir que a API Web Crypto global está disponível no Node.js
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// ---------- Hoisted Memory Database Mock ----------
const {
  mockDb,
  getMockStore,
  setMockStore,
  resetMockStore,
  setAutoId
} = vi.hoisted(() => {
  let mockStore: Record<string, any[]> = {
    turmas: [],
    alunos: [],
    frequencias: [],
    conteudos: [],
    avaliacoes: [],
    notas: [],
    fechamentos: [],
    userSalts: [],
    syncLogs: [],
    syncQueue: [],
  };
  let autoId = 1;

  const createTableMock = (tableName: string) => {
    return {
      bulkPut: async (records: any[]) => {
        records.forEach(r => {
          const idField = r.localId !== undefined ? 'localId' : (r.id !== undefined ? 'id' : (r.userId !== undefined ? 'userId' : 'localId'));
          const searchVal = r[idField];
          const idx = mockStore[tableName].findIndex((x: any) => x[idField] === searchVal);
          if (idx >= 0) {
            mockStore[tableName][idx] = { ...mockStore[tableName][idx], ...r };
          } else {
            mockStore[tableName].push(r);
          }
        });
      },
      bulkDelete: async (ids: any[]) => {
        mockStore[tableName] = mockStore[tableName].filter(
          (x: any) => !ids.includes(x.localId) && !ids.includes(x.id)
        );
      },
      clear: async () => {
        mockStore[tableName] = [];
      },
      toArray: async () => mockStore[tableName],
      add: async (item: any) => {
        const idField = item.localId !== undefined ? 'localId' : (item.id !== undefined ? 'id' : (item.userId !== undefined ? 'userId' : 'localId'));
        const newItem = { ...item };
        if (newItem[idField] === undefined) {
          newItem[idField] = autoId++;
        }
        mockStore[tableName].push(newItem);
        return newItem[idField];
      },
      get: async (id: any) => {
        return mockStore[tableName].find((x: any) => x.id === id || x.userId === id || x.localId === id) || null;
      },
      put: async (record: any) => {
        const idField = record.userId !== undefined ? 'userId' : (record.localId !== undefined ? 'localId' : (record.id !== undefined ? 'id' : 'localId'));
        const searchVal = record[idField] !== undefined ? record[idField] : autoId++;
        const recordToSave = { ...record };
        recordToSave[idField] = searchVal;
        
        const idx = mockStore[tableName].findIndex((x: any) => x[idField] === searchVal);
        if (idx >= 0) {
          mockStore[tableName][idx] = recordToSave;
        } else {
          mockStore[tableName].push(recordToSave);
        }
        return searchVal;
      },
      update: async (localId: any, changes: any) => {
        const idx = mockStore[tableName].findIndex((x: any) => x.localId === localId || x.id === localId || x.userId === localId);
        if (idx >= 0) {
          mockStore[tableName][idx] = { ...mockStore[tableName][idx], ...changes };
          return 1;
        }
        return 0;
      },
      where: (field: string) => {
        const queryEquals = (val: any) => {
          const matching = mockStore[tableName].filter((x: any) => {
            if (Array.isArray(val) && field === '[turma_id+aluno_id+data+tempo+disciplina]') {
              return (
                x.turma_id === val[0] &&
                x.aluno_id === val[1] &&
                x.data === val[2] &&
                x.tempo === val[3] &&
                x.disciplina === val[4]
              );
            }
            if (Array.isArray(val) && field === '[avaliacao_id+aluno_id]') {
              return x.avaliacao_id === val[0] && x.aluno_id === val[1];
            }
            return x[field] === val;
          });

          return {
            toArray: async () => matching,
            first: async () => matching[0],
            filter: (fn: any) => ({
              toArray: async () => matching.filter(fn),
            }),
          };
        };

        const queryAnyOf = (vals: any[]) => {
          const matching = mockStore[tableName].filter((x: any) => vals.includes(x[field]));
          return {
            toArray: async () => matching,
          };
        };

        const queryBetween = (start: any[], end: any[]) => {
          return {
            toArray: async () => {
              return mockStore[tableName].filter((x: any) => {
                const statusMatch = x.syncStatus === start[0];
                const dateMatch = x.updatedAt < end[1];
                return statusMatch && dateMatch;
              });
            },
          };
        };

        const queryBelow = (val: any) => {
          const matching = mockStore[tableName].filter((x: any) => x[field] < val);
          return {
            toArray: async () => matching,
          };
        };

        return {
          equals: queryEquals,
          anyOf: queryAnyOf,
          between: queryBetween,
          below: queryBelow,
        };
      },
    };
  };

  const dbInstance: any = {
    turmas: createTableMock('turmas'),
    alunos: createTableMock('alunos'),
    frequencias: createTableMock('frequencias'),
    conteudos: createTableMock('conteudos'),
    avaliacoes: createTableMock('avaliacoes'),
    notas: createTableMock('notas'),
    fechamentos: createTableMock('fechamentos'),
    userSalts: createTableMock('userSalts'),
    syncLogs: createTableMock('syncLogs'),
    syncQueue: createTableMock('syncQueue'),
    transaction: async (mode: string, tables: any, callback: any) => {
      return await callback();
    },
  };

  return {
    mockDb: dbInstance,
    getMockStore: () => mockStore,
    setMockStore: (val: any) => { mockStore = val; },
    resetMockStore: () => {
      mockStore = {
        turmas: [],
        alunos: [],
        frequencias: [],
        conteudos: [],
        avaliacoes: [],
        notas: [],
        fechamentos: [],
        userSalts: [],
        syncLogs: [],
        syncQueue: [],
      };
      autoId = 1;
    },
    setAutoId: (val: number) => { autoId = val; }
  };
});

// ---------- Mock db.ts ----------
vi.mock('../lib/db', () => {
  return {
    db: mockDb,
    now: () => new Date().toISOString(),
    OPERATIONAL_TABLE_NAMES: ['frequencias', 'conteudos', 'avaliacoes', 'notas', 'fechamentos'],
    getOperationalTable: (name: string) => mockDb[name],
  };
});

// ---------- Mock Supabase ----------
let currentUserId = 'user-test-123';
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: { id: currentUserId },
          },
        },
      }),
    },
  },
}));

// ---------- Import under test ----------
import {
  cacheTurmas,
  getCachedTurmas,
  cacheAlunos,
  getCachedAlunos,
  saveFrequenciaLocal,
  clearOldSyncedData,
} from '../services/offlineStorage';
import { db } from '../lib/db';

describe('offlineStorage Service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetMockStore();
    currentUserId = 'user-test-123';
  });

  // ====== Turmas ======
  it('deve armazenar e recuperar turmas offline', async () => {
    const list = [
      { id: 't-1', nome: '1º Ano A', turno: 'Manhã', escola_id: 'escola-1' },
      { id: 't-2', nome: '2º Ano B', turno: 'Tarde', escola_id: 'escola-1' },
    ];

    await cacheTurmas(list);

    const cached = await getCachedTurmas('escola-1');
    expect(cached).toHaveLength(2);
    expect(cached[0].nome).toBe('1º Ano A');
    expect(cached[0].syncStatus).toBe('synced');
  });

  // ====== Alunos (Criptografia) ======
  it('deve criptografar dados sensíveis de alunos no cache e descriptografar na busca', async () => {
    const originalAlunos = [
      { id: 'a-1', nome: 'João da Silva', cpf: '123.456.789-00', turma_id: 't-1' },
    ];

    // Salvar no cache (criptografa automaticamente)
    await cacheAlunos(originalAlunos);

    // Verificar se no mock do BD o nome está criptografado (não legível direto)
    const store = getMockStore();
    const rawInDb = store.alunos[0];
    expect(rawInDb.nome).not.toBe('João da Silva');
    expect(rawInDb.cpf).not.toBe('123.456.789-00');

    // Recuperar (descriptografa automaticamente)
    const retrieved = await getCachedAlunos('t-1');
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].nome).toBe('João da Silva');
    expect(retrieved[0].cpf).toBe('123.456.789-00');
  });

  // ====== Frequencias & Quota Recovery ======
  it('deve realizar limpeza de dados antigos quando IndexedDB relatar erro QuotaExceeded', async () => {
    const store = getMockStore();
    // Inserir um registro antigo para limpeza
    store.frequencias.push({
      localId: 99,
      turma_id: 't-1',
      aluno_id: 'a-1',
      data: '2026-01-01',
      tempo: '1',
      status: 'P',
      participacao: 'Presencial',
      disciplina: 'História',
      syncStatus: 'synced',
      updatedAt: '2026-01-01T00:00:00.000Z', // bem antigo
    });

    let hasThrown = false;
    const originalAdd = db.frequencias.add;

    // Fazer a primeira chamada lançar erro de cota
    db.frequencias.add = async (item: any) => {
      if (!hasThrown) {
        hasThrown = true;
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      return await originalAdd(item);
    };

    const freq = {
      turma_id: 't-1',
      aluno_id: 'a-2',
      data: '2026-06-20',
      tempo: '1',
      status: 'F',
      participacao: 'Remoto',
      disciplina: 'História',
    };

    const localId = await saveFrequenciaLocal(freq);
    expect(localId).toBeDefined(); // Deve ter retentado e retornado ID com sucesso
    expect(hasThrown).toBe(true);

    const updatedStore = getMockStore();
    // Deve ter limpado a frequencia de 99 (mais antiga de 30 dias)
    expect(updatedStore.frequencias.find(f => f.localId === 99)).toBeUndefined();
    expect(updatedStore.frequencias.find(f => f.localId === localId)).toBeDefined();

    // Restaurar método
    db.frequencias.add = originalAdd;
  });

  // ====== Limpeza ======
  it('deve remover dados antigos sincronizados de acordo com a idade limite', async () => {
    const nowISO = new Date();
    const olderISO = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(); // 40 dias atrás

    const store = getMockStore();
    store.frequencias.push({
      localId: 1,
      syncStatus: 'synced',
      updatedAt: olderISO,
    });

    store.frequencias.push({
      localId: 2,
      syncStatus: 'pending', // Não deve remover mesmo antigo
      updatedAt: olderISO,
    });

    store.frequencias.push({
      localId: 3,
      syncStatus: 'synced',
      updatedAt: nowISO.toISOString(), // recente, não deve remover
    });

    const deleted = await clearOldSyncedData(30); // Limite de 30 dias
    expect(deleted).toBe(1); // Somente o localId 1

    const updatedStore = getMockStore();
    expect(updatedStore.frequencias.find(f => f.localId === 1)).toBeUndefined();
    expect(updatedStore.frequencias.find(f => f.localId === 2)).toBeDefined();
    expect(updatedStore.frequencias.find(f => f.localId === 3)).toBeDefined();
  });
});
