import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------- Mock do Dexie (IndexedDB) ----------
// Simula a tabela syncQueue como um array em memória

let mockQueue: any[] = [];
let autoId = 1;

const createMockTable = () => ({
  add: vi.fn(async (item: any) => {
    const id = autoId++;
    mockQueue.push({ ...item, id });
    return id;
  }),
  get: vi.fn(async (id: number) => mockQueue.find(i => i.id === id)),
  update: vi.fn(async (id: number, changes: any) => {
    const idx = mockQueue.findIndex(i => i.id === id);
    if (idx >= 0) mockQueue[idx] = { ...mockQueue[idx], ...changes };
  }),
  delete: vi.fn(async (id: number) => {
    mockQueue = mockQueue.filter(i => i.id !== id);
  }),
  clear: vi.fn(async () => { mockQueue = []; }),
  where: vi.fn((field: string) => ({
    equals: (val: string) => ({
      filter: (fn: (item: any) => boolean) => ({
        first: async () => mockQueue.filter(i => i[field] === val).filter(fn)[0],
        toArray: async () => mockQueue.filter(i => i[field] === val).filter(fn),
      }),
      count: async () => mockQueue.filter(i => i[field] === val).length,
      toArray: async () => mockQueue.filter(i => i[field] === val),
      sortBy: async (sortField: string) =>
        mockQueue
          .filter(i => i[field] === val)
          .sort((a: any, b: any) => (a[sortField] > b[sortField] ? 1 : -1)),
    }),
    anyOf: (vals: string[]) => ({
      count: async () => mockQueue.filter(i => vals.includes(i[field])).length,
    }),
  })),
  orderBy: vi.fn((_field: string) => ({
    toArray: async () => [...mockQueue].sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
  })),
});

vi.mock('../lib/db', () => ({
  db: { syncQueue: createMockTable() },
  now: () => new Date().toISOString(),
  hashOperation: async (_t: string, _o: string, p: any) =>
    `hash_${JSON.stringify(p).slice(0, 16)}`,
}));

// ---------- Import sob teste ----------
import {
  enqueue,
  dequeue,
  peek,
  getAllPending,
  getPendingCount,
  markProcessing,
  markDone,
  retry,
  fail,
  retryAllErrors,
  resetStuckItems,
  clearQueue,
  getQueueStats,
} from '../services/offlineQueue';

describe('offlineQueue', () => {
  beforeEach(() => {
    mockQueue = [];
    autoId = 1;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ====== enqueue ======
  it('deve adicionar um item à fila e retornar um id', async () => {
    const id = await enqueue('frequencias', 'UPSERT', { turma_id: '1' });
    expect(id).toBe(1);
    expect(mockQueue).toHaveLength(1);
    expect(mockQueue[0].table).toBe('frequencias');
    expect(mockQueue[0].status).toBe('pending');
  });

  it('deve deduplica operações com mesmo hash (status pending)', async () => {
    await enqueue('frequencias', 'UPSERT', { turma_id: '1' });
    const id2 = await enqueue('frequencias', 'UPSERT', { turma_id: '1' });
    // O segundo enqueue deve atualizar o existente, não criar novo
    expect(mockQueue).toHaveLength(1);
    expect(id2).toBe(1);
  });

  it('deve lançar erro quando a fila atinge o limite máximo', async () => {
    // Adicionar 5000 itens (simulando mockQueue cheia)
    for (let i = 0; i < 5000; i++) {
      mockQueue.push({
        id: autoId++,
        table: 'test',
        operation: 'UPSERT',
        payload: '{}',
        status: 'pending',
        hash: `hash_${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        retryCount: 0,
      });
    }

    await expect(
      enqueue('frequencias', 'UPSERT', { turma_id: 'novo' })
    ).rejects.toThrow(/Limite de operações pendentes/);
  });

  // ====== dequeue ======
  it('deve remover item da fila', async () => {
    const id = await enqueue('conteudos', 'INSERT', { data: '2026-01-01' });
    expect(mockQueue).toHaveLength(1);
    await dequeue(id);
    expect(mockQueue).toHaveLength(0);
  });

  // ====== peek ======
  it('deve retornar o primeiro item pendente', async () => {
    await enqueue('conteudos', 'INSERT', { data: 'a' });
    await enqueue('notas', 'UPSERT', { data: 'b' });
    const item = await peek();
    expect(item).toBeDefined();
    expect(item?.table).toBe('conteudos');
  });

  // ====== getPendingCount ======
  it('deve contar itens pendentes e em processamento', async () => {
    await enqueue('t1', 'INSERT', { x: 1 });
    await enqueue('t2', 'INSERT', { x: 2 });
    const count = await getPendingCount();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // ====== markProcessing ======
  it('deve marcar item como processing', async () => {
    const id = await enqueue('t', 'INSERT', { x: 1 });
    await markProcessing(id);
    expect(mockQueue.find(i => i.id === id)?.status).toBe('processing');
  });

  // ====== markDone ======
  it('deve remover item ao marcar como done', async () => {
    const id = await enqueue('t', 'INSERT', { x: 1 });
    await markDone(id);
    expect(mockQueue.find(i => i.id === id)).toBeUndefined();
  });

  // ====== retry ======
  it('deve incrementar retryCount e calcular backoff', async () => {
    const id = await enqueue('t', 'INSERT', { x: 1 });
    const willRetry = await retry(id, 'Erro temporário');
    expect(willRetry).toBe(true);
    const item = mockQueue.find(i => i.id === id);
    expect(item?.retryCount).toBe(1);
    expect(item?.lastError).toBe('Erro temporário');
    expect(item?.retryAfter).toBeDefined();
  });

  it('deve marcar como error após MAX_RETRIES (5)', async () => {
    const id = await enqueue('t', 'INSERT', { x: 1 });
    // Simular 5 retries
    for (let i = 0; i < 5; i++) {
      await retry(id, `Erro ${i + 1}`);
    }
    const item = mockQueue.find(i => i.id === id);
    expect(item?.status).toBe('error');
  });

  // ====== fail ======
  it('deve marcar item como erro permanente', async () => {
    const id = await enqueue('t', 'INSERT', { x: 1 });
    await fail(id, 'Erro fatal');
    const item = mockQueue.find(i => i.id === id);
    expect(item?.status).toBe('error');
    expect(item?.lastError).toBe('Erro fatal');
  });

  // ====== retryAllErrors ======
  it('deve resetar itens com erro para pending', async () => {
    const id = await enqueue('t', 'INSERT', { x: 1 });
    await fail(id, 'Erro');
    const count = await retryAllErrors();
    expect(count).toBe(1);
    const item = mockQueue.find(i => i.id === id);
    expect(item?.status).toBe('pending');
    expect(item?.retryCount).toBe(0);
  });

  // ====== resetStuckItems ======
  it('deve resetar itens "processing" travados há mais de 60s', async () => {
    const id = await enqueue('t', 'INSERT', { x: 1 });
    await markProcessing(id);
    // Simular que foi atualizado há 2 minutos
    const item = mockQueue.find(i => i.id === id);
    if (item) item.updatedAt = new Date(Date.now() - 120_000).toISOString();
    const count = await resetStuckItems();
    expect(count).toBe(1);
    expect(mockQueue.find(i => i.id === id)?.status).toBe('pending');
  });

  // ====== clearQueue ======
  it('deve limpar toda a fila', async () => {
    await enqueue('t1', 'INSERT', { x: 1 });
    await enqueue('t2', 'INSERT', { x: 2 });
    await clearQueue();
    expect(mockQueue).toHaveLength(0);
  });

  // ====== getQueueStats ======
  it('deve retornar contagem por status', async () => {
    const stats = await getQueueStats();
    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('processing');
    expect(stats).toHaveProperty('error');
  });
});
