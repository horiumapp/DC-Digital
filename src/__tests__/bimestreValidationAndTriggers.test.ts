import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBimestreNumero, getPeriodoInfoPorData, getBimestrePorData } from '../utils/dateUtils';
import type { SyncQueueItem } from '../lib/db';

// ---------- Mock do Dexie (IndexedDB) para testar fila offline ----------
let mockQueue: SyncQueueItem[] = [];
let autoId = 1;

vi.mock('../lib/db', () => {
  return {
    db: {
      transaction: async (_mode: string, _tables: unknown, callback: () => Promise<unknown>) => {
        return await callback();
      },
      syncQueue: {
        add: async (item: Omit<SyncQueueItem, 'id'>) => {
          const id = autoId++;
          mockQueue.push({ ...item, id });
          return id;
        },
        get: async (id: number) => mockQueue.find(i => i.id === id),
        update: async (id: number, changes: Partial<SyncQueueItem>) => {
          const idx = mockQueue.findIndex(i => i.id === id);
          if (idx >= 0) mockQueue[idx] = { ...mockQueue[idx], ...changes };
        },
        delete: async (id: number) => {
          mockQueue = mockQueue.filter(i => i.id !== id);
        },
        clear: async () => { mockQueue = []; },
        where: (field: keyof SyncQueueItem) => ({
          equals: (val: string) => ({
            filter: (fn: (item: SyncQueueItem) => boolean) => ({
              first: async () => mockQueue.filter(i => (i[field] as unknown) === val).filter(fn)[0],
              toArray: async () => mockQueue.filter(i => (i[field] as unknown) === val).filter(fn),
            }),
            count: async () => mockQueue.filter(i => (i[field] as unknown) === val).length,
            toArray: async () => mockQueue.filter(i => (i[field] as unknown) === val),
          }),
        }),
      },
    },
    now: () => new Date().toISOString(),
  };
});

import { retryDeadLetterItems, getDeadLetterItems } from '../services/offlineQueue';

describe('Validação e Normalização de Bimestres (dateUtils.ts)', () => {
  it('deve extrair o número correto do bimestre a partir de strings diversas', () => {
    expect(getBimestreNumero('1º Bimestre')).toBe(1);
    expect(getBimestreNumero('1. BIMESTRE')).toBe(1);
    expect(getBimestreNumero('1')).toBe(1);
    expect(getBimestreNumero('2º Bimestre')).toBe(2);
    expect(getBimestreNumero('2. BIMESTRE')).toBe(2);
    expect(getBimestreNumero('3º Bimestre')).toBe(3);
    expect(getBimestreNumero('4º Bimestre')).toBe(4);
    expect(getBimestreNumero('Invalido')).toBeNull();
  });

  it('deve extrair o número correto do bimestre a partir de datas (ISO ou DD/MM/YYYY)', () => {
    // 1º Bimestre: 2026-02-05 a 2026-04-23
    expect(getBimestreNumero('2026-03-15')).toBe(1);
    expect(getBimestreNumero('15/03/2026')).toBe(1);

    // 2º Bimestre: 2026-04-24 a 2026-07-07
    expect(getBimestreNumero('2026-05-20')).toBe(2);
    expect(getBimestreNumero('20/05/2026')).toBe(2);

    // 3º Bimestre: 2026-07-16 a 2026-09-24 (inclui 21/07/2026 do erro do usuário)
    expect(getBimestreNumero('2026-07-21')).toBe(3);
    expect(getBimestreNumero('21/07/2026')).toBe(3);

    // 4º Bimestre: 2026-09-25 a 2026-12-14
    expect(getBimestreNumero('2026-10-15')).toBe(4);
    expect(getBimestreNumero('15/10/2026')).toBe(4);
  });

  it('deve retornar detalhes completos do período com getPeriodoInfoPorData', () => {
    const info3 = getPeriodoInfoPorData('2026-07-21');
    expect(info3).toBeDefined();
    expect(info3?.id).toBe('3. BIMESTRE');
    expect(info3?.nome).toBe('3º Bimestre');
    expect(info3?.numero).toBe(3);

    const info1 = getPeriodoInfoPorData('15/02/2026');
    expect(info1).toBeDefined();
    expect(info1?.id).toBe('1. BIMESTRE');
    expect(info1?.nome).toBe('1º Bimestre');
    expect(info1?.numero).toBe(1);
  });

  it('data de 21/07/2026 NÃO deve cair no 1º Bimestre', () => {
    // Esse teste garante a correção direta da causa raiz do bloqueio indevido
    const bimNumero = getBimestreNumero('2026-07-21');
    expect(bimNumero).not.toBe(1);
    expect(bimNumero).toBe(3);
    expect(getBimestrePorData('2026-07-21')).toBe('3º Bimestre');
  });
});

describe('Recuperação de Itens da Dead Letter Queue (offlineQueue.ts)', () => {
  beforeEach(() => {
    mockQueue = [];
    autoId = 1;
  });

  it('deve reprocessar itens que falharam permanentemente (dead_letter -> pending)', async () => {
    mockQueue = [
      {
        id: 87,
        hash: 'hash-87',
        table: 'frequencias',
        operation: 'UPSERT',
        payload: JSON.stringify({ turma_id: 'turma-1', data: '2026-07-21', disciplina: 'Matemática' }),
        status: 'error',
        retryCount: 5,
        lastError: '[DEAD_LETTER] Operação bloqueada: o período letivo desta turma e disciplina já foi fechado...',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 88,
        hash: 'hash-88',
        table: 'notas',
        operation: 'UPSERT',
        payload: JSON.stringify({ turma_id: 'turma-1', bimestre: '3º Bimestre' }),
        status: 'pending',
        retryCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const deadBefore = await getDeadLetterItems();
    expect(deadBefore.length).toBe(1);
    expect(deadBefore[0].id).toBe(87);

    // Re-enfileirar itens mortos para sincronização
    const reloadedCount = await retryDeadLetterItems();
    expect(reloadedCount).toBe(1);

    const deadAfter = await getDeadLetterItems();
    expect(deadAfter.length).toBe(0);

    const reloadedItem = mockQueue.find(i => i.id === 87);
    expect(reloadedItem?.status).toBe('pending');
    expect(reloadedItem?.retryCount).toBe(0);
    expect(reloadedItem?.lastError).toBeUndefined();
  });
});
