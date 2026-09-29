import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webcrypto } from 'crypto';

// Garantir que a API Web Crypto global está disponível no Node.js
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}

type MockRecord = Record<string, unknown>;

// ---------- Hoisted Memory Database Mock ----------
const {
  mockDb,
  getMockStore,
  resetMockStore
} = vi.hoisted(() => {
  let mockStore: Record<string, MockRecord[]> = {
    turmas: [],
    alunos: [],
    frequencias: [],
    conteudos: [],
    avaliacoes: [],
    notas: [],
    horarios: [],
    fechamentos: [],
    curriculos: [],
    userSalts: [],
    syncLogs: [],
    syncQueue: [],
    cachedUsers: [],
    files: [],
  };
  let autoId = 1;

  const createTableMock = (tableName: string) => {
    return {
      bulkPut: async (records: MockRecord[]) => {
        records.forEach(r => {
          const idField = r.localId !== undefined ? 'localId' : (r.id !== undefined ? 'id' : (r.userId !== undefined ? 'userId' : 'localId'));
          const searchVal = r[idField];
          const idx = mockStore[tableName].findIndex((x: MockRecord) => x[idField] === searchVal);
          if (idx >= 0) {
            mockStore[tableName][idx] = { ...mockStore[tableName][idx], ...r };
          } else {
            mockStore[tableName].push(r);
          }
        });
      },
      bulkDelete: async (ids: unknown[]) => {
        mockStore[tableName] = mockStore[tableName].filter(
          (x: MockRecord) => !ids.includes(x.localId) && !ids.includes(x.id)
        );
      },
      delete: async (id: unknown) => {
        mockStore[tableName] = mockStore[tableName].filter(
          (x: MockRecord) => x.localId !== id && x.id !== id
        );
      },
      clear: async () => {
        mockStore[tableName] = [];
      },
      toArray: async () => mockStore[tableName],
      add: async (item: MockRecord) => {
        const idField = item.localId !== undefined ? 'localId' : (item.id !== undefined ? 'id' : (item.userId !== undefined ? 'userId' : 'localId'));
        const newItem = { ...item };
        if (newItem[idField] === undefined) {
          newItem[idField] = autoId++;
        }
        mockStore[tableName].push(newItem);
        return newItem[idField];
      },
      get: async (id: unknown) => {
        return mockStore[tableName].find((x: MockRecord) => x.id === id || x.userId === id || x.localId === id) || null;
      },
      put: async (record: MockRecord) => {
        const idField = record.userId !== undefined ? 'userId' : (record.localId !== undefined ? 'localId' : (record.id !== undefined ? 'id' : 'localId'));
        const searchVal = record[idField] !== undefined ? record[idField] : autoId++;
        const recordToSave = { ...record };
        recordToSave[idField] = searchVal;
        
        const idx = mockStore[tableName].findIndex((x: MockRecord) => x[idField] === searchVal);
        if (idx >= 0) {
          mockStore[tableName][idx] = recordToSave;
        } else {
          mockStore[tableName].push(recordToSave);
        }
        return searchVal;
      },
      update: async (localId: unknown, changes: MockRecord) => {
        const idx = mockStore[tableName].findIndex((x: MockRecord) => x.localId === localId || x.id === localId || x.userId === localId);
        if (idx >= 0) {
          mockStore[tableName][idx] = { ...mockStore[tableName][idx], ...changes };
          return 1;
        }
        return 0;
      },
      where: (field: string) => {
        const queryEquals = (val: unknown) => {
          const matching = mockStore[tableName].filter((x: MockRecord) => {
            if (Array.isArray(val) && field === '[turma_id+aluno_id+data+tempo+disciplina]') {
              return (
                x.turma_id === val[0] &&
                x.aluno_id === val[1] &&
                x.data === val[2] &&
                x.tempo === val[3] &&
                x.disciplina === val[4]
              );
            }
            if (Array.isArray(val) && field === '[turma_id+data+tempo+disciplina]') {
              return (
                x.turma_id === val[0] &&
                x.data === val[1] &&
                x.tempo === val[2] &&
                x.disciplina === val[3]
              );
            }
            if (Array.isArray(val) && field === '[turma_id+disciplina+bimestre]') {
              return (
                x.turma_id === val[0] &&
                x.disciplina === val[1] &&
                x.bimestre === val[2]
              );
            }
            if (Array.isArray(val) && field === '[avaliacao_id+aluno_id]') {
              return x.avaliacao_id === val[0] && x.aluno_id === val[1];
            }
            return x[field] === val;
          });

          return {
            toArray: async () => matching,
            first: async () => matching[0] || null,
            count: async () => matching.length,
            filter: (fn: (item: MockRecord) => boolean) => ({
              toArray: async () => matching.filter(fn),
              first: async () => matching.filter(fn)[0] || null,
            }),
          };
        };

        const queryAnyOf = (vals: unknown[]) => {
          const matching = mockStore[tableName].filter((x: MockRecord) => vals.includes(x[field]));
          return {
            toArray: async () => matching,
            count: async () => matching.length,
          };
        };

        const queryBetween = (lower: unknown[], upper: unknown[]) => {
          const matching = mockStore[tableName].filter((x: MockRecord) => {
            if (field === '[syncStatus+updatedAt]') {
              return x.syncStatus === lower[0] && String(x.updatedAt) < String(upper[1]);
            }
            if (field === '[turma_id+aluno_id+data+tempo+disciplina]') {
              return (
                x.turma_id === lower[0] &&
                x.data === lower[2] &&
                x.tempo === lower[3] &&
                x.disciplina === lower[4]
              );
            }
            if (field === '[turma_id+disciplina+bimestre]') {
              return x.turma_id === lower[0] && x.disciplina === lower[1];
            }
            return true;
          });
          return {
            toArray: async () => matching,
          };
        };

        const queryBelow = (val: string) => {
          const matching = mockStore[tableName].filter((x: MockRecord) => String(x[field]) < val);
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
      filter: (fn: (item: MockRecord) => boolean) => ({
        first: async () => mockStore[tableName].filter(fn)[0],
        toArray: async () => mockStore[tableName].filter(fn),
      }),
    };
  };

  const dbInstance = {
    turmas: createTableMock('turmas'),
    alunos: createTableMock('alunos'),
    frequencias: createTableMock('frequencias'),
    conteudos: createTableMock('conteudos'),
    avaliacoes: createTableMock('avaliacoes'),
    notas: createTableMock('notas'),
    horarios: createTableMock('horarios'),
    fechamentos: createTableMock('fechamentos'),
    curriculos: createTableMock('curriculos'),
    userSalts: createTableMock('userSalts'),
    syncLogs: createTableMock('syncLogs'),
    syncQueue: createTableMock('syncQueue'),
    cachedUsers: createTableMock('cachedUsers'),
    files: createTableMock('files'),
    transaction: async (_mode: string, _tables: unknown, callback: () => Promise<unknown>) => {
      return await callback();
    },
  };

  return {
    mockDb: dbInstance,
    getMockStore: () => mockStore,
    resetMockStore: () => {
      mockStore = {
        turmas: [],
        alunos: [],
        frequencias: [],
        conteudos: [],
        avaliacoes: [],
        notas: [],
        horarios: [],
        fechamentos: [],
        curriculos: [],
        userSalts: [],
        syncLogs: [],
        syncQueue: [],
        cachedUsers: [],
        files: [],
      };
      autoId = 1;
    },
  };
});

// ---------- Mock db.ts ----------
vi.mock('../lib/db', () => {
  return {
    db: mockDb,
    now: () => new Date().toISOString(),
    hashOperation: async (table: string, operation: string, payload: Record<string, unknown>) =>
      `hash_${table}_${operation}_${JSON.stringify(payload)}`,
    OPERATIONAL_TABLE_NAMES: ['frequencias', 'conteudos', 'avaliacoes', 'notas', 'fechamentos'],
    getOperationalTable: (name: string) => (mockDb as Record<string, unknown>)[name],
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
  deleteFrequenciasLocal,
  saveConteudoLocal,
  deleteConteudoLocal,
  saveAvaliacaoLocal,
  deleteAvaliacaoLocal,
  clearOldSyncedData,
  clearAllLocalData,
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
    const { alunos: retrieved, decryptionFailed } = await getCachedAlunos('t-1');
    expect(decryptionFailed).toBe(false);
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
    db.frequencias.add = (async (item: Parameters<typeof originalAdd>[0]) => {
      if (!hasThrown) {
        hasThrown = true;
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      }
      return await originalAdd.call(db.frequencias, item);
    }) as typeof originalAdd;

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

  it('removes an offline evaluation, its notes, and only related queue entries', async () => {
    const store = getMockStore();
    store.avaliacoes.push({ localId: 42, clientTempId: 'temp_1720000000000' });
    store.notas.push(
      { localId: 1, avaliacao_id: 'temp_1720000000000' },
      { localId: 2, avaliacao_id: 'temp_42' },
      { localId: 3, avaliacao_id: 'avaliacao-preservada' },
    );
    store.syncQueue.push(
      { id: 10, table: 'avaliacoes', operation: 'INSERT', localId: 42, payload: '{}', status: 'pending', hash: 'av', createdAt: '2026-01-01', updatedAt: '2026-01-01', retryCount: 0 },
      { id: 11, table: 'notas', operation: 'UPSERT', payload: JSON.stringify({ records: [{ avaliacao_id: 'temp_1720000000000', aluno_id: 'a1' }] }), status: 'pending', hash: 'notas-1', createdAt: '2026-01-01', updatedAt: '2026-01-01', retryCount: 0 },
      { id: 12, table: 'notas', operation: 'UPSERT', payload: JSON.stringify({ records: [{ avaliacao_id: 'temp_42', aluno_id: 'a2' }, { avaliacao_id: 'avaliacao-preservada', aluno_id: 'a3' }] }), status: 'pending', hash: 'notas-2', createdAt: '2026-01-01', updatedAt: '2026-01-01', retryCount: 0 },
    );

    await deleteAvaliacaoLocal('temp_1720000000000');

    expect(store.avaliacoes).toHaveLength(0);
    expect(store.notas.map(n => n.localId)).toEqual([3]);
    expect(store.syncQueue.map(item => item.id)).toEqual([12]);
    expect(JSON.parse(String(store.syncQueue[0].payload)).records).toEqual([
      { avaliacao_id: 'avaliacao-preservada', aluno_id: 'a3' },
    ]);
  });

  it('normaliza turma_id composto (UUID||Componente) para UUID puro em operações locais', async () => {
    const rawTurmaId = '12345678-1234-1234-1234-1234567890ab||Matemática';
    const expectedTid = '12345678-1234-1234-1234-1234567890ab';

    await saveFrequenciaLocal({
      turma_id: rawTurmaId,
      aluno_id: 'aluno-1',
      data: '2026-03-01',
      tempo: '1',
      status: 'P',
      participacao: 'Presencial',
      disciplina: 'Matemática',
    });

    await saveConteudoLocal({
      turma_id: rawTurmaId,
      data: '2026-03-01',
      tempo: '1',
      objetos: ['Geometria'],
      habilidades: ['EF01MA01'],
      descricao: 'Aula inaugural',
      disciplina: 'Matemática',
    });

    await saveAvaliacaoLocal({
      turma_id: rawTurmaId,
      tipo: 'PROVA',
      data: '2026-03-10',
      instrumento: 'Escrita',
      objetos: [{ objeto: 'Geometria', unidade: 'Unidade 1' }],
      bimestre: '1º',
      valor_maximo: 10,
      disciplina: 'Matemática',
    });

    const store = getMockStore();
    expect(store.frequencias[0].turma_id).toBe(expectedTid);
    expect(store.conteudos[0].turma_id).toBe(expectedTid);
    expect(store.avaliacoes[0].turma_id).toBe(expectedTid);
  });

  it('limpa todas as tabelas incluindo curriculos ao chamar clearAllLocalData', async () => {
    const store = getMockStore();
    store.turmas.push({ id: 't1' });
    store.curriculos.push({ id: 'c1', modalidade: 'EF1' });
    store.alunos.push({ id: 'a1' });

    await clearAllLocalData();

    expect(store.turmas).toHaveLength(0);
    expect(store.curriculos).toHaveLength(0);
    expect(store.alunos).toHaveLength(0);
  });

  it('purga operações pendentes de UPSERT na fila ao deletar frequência local', async () => {
    const store = getMockStore();
    store.frequencias.push({
      localId: 1,
      turma_id: 't-123',
      aluno_id: 'a-1',
      data: '2026-04-15',
      tempo: '1',
      disciplina: 'História',
      status: 'P',
      syncStatus: 'pending',
    });

    store.syncQueue.push({
      id: 99,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: JSON.stringify({
        records: [{
          turma_id: 't-123',
          aluno_id: 'a-1',
          data: '2026-04-15',
          tempo: '1',
          disciplina: 'História',
          status: 'P',
        }],
      }),
      status: 'pending',
      hash: 'h-freq-1',
      createdAt: '2026-04-15',
      updatedAt: '2026-04-15',
      retryCount: 0,
    });

    await deleteFrequenciasLocal('t-123', 'História', '2026-04-15', '1');

    expect(store.frequencias).toHaveLength(0);
    expect(store.syncQueue).toHaveLength(0);
  });

  it('purga operações pendentes de UPSERT na fila ao deletar conteúdo local', async () => {
    const store = getMockStore();
    store.conteudos.push({
      localId: 2,
      turma_id: 't-123',
      data: '2026-04-15',
      tempo: '1',
      disciplina: 'História',
      descricao: 'Aula offline',
      syncStatus: 'pending',
    });

    store.syncQueue.push({
      id: 100,
      table: 'conteudos',
      operation: 'UPSERT',
      payload: JSON.stringify({
        turma_id: 't-123',
        data: '2026-04-15',
        tempo: '1',
        disciplina: 'História',
        descricao: 'Aula offline',
      }),
      status: 'pending',
      hash: 'h-cont-1',
      createdAt: '2026-04-15',
      updatedAt: '2026-04-15',
      retryCount: 0,
    });

    await deleteConteudoLocal('t-123', 'História', '2026-04-15', '1');

    expect(store.conteudos).toHaveLength(0);
    expect(store.syncQueue).toHaveLength(0);
  });
});
