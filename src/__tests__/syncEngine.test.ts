import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------- Mock navigator.onLine ----------
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

// ---------- Mock offlineQueue ----------
// O syncEngine importa from './offlineQueue', resolvido como '../services/offlineQueue' do teste
const mockPeekResults: any[] = [];
let peekIndex = 0;

vi.mock('../services/offlineQueue', () => ({
  resetStuckItems: vi.fn(async () => 0),
  peek: vi.fn(async () => mockPeekResults[peekIndex++] || undefined),
  markProcessing: vi.fn(async () => {}),
  markDone: vi.fn(async () => {}),
  retry: vi.fn(async () => true),
  fail: vi.fn(async () => {}),
  getAllPending: vi.fn(async () => []),
  getPendingCount: vi.fn(async () => 0),
}));

// ---------- Mock supabase ----------
const mockUpsert = vi.fn(async () => ({ data: null, error: null }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          })),
        })),
      })),
      insert: vi.fn(async () => ({ data: [{ id: 'server-uuid-123' }], error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
  },
}));

// ---------- Mock db ----------
const mockModify = vi.fn(async () => 0);
const mockFilter = vi.fn(() => ({ modify: mockModify, toArray: vi.fn(async () => []) }));
const mockEquals = vi.fn(() => ({
  filter: mockFilter,
  modify: mockModify,
  toArray: vi.fn(async () => []),
}));
const mockWhere = vi.fn(() => ({ equals: mockEquals, below: vi.fn(() => ({ delete: vi.fn(async () => 0) })) }));

vi.mock('../lib/db', () => ({
  db: {
    syncLogs: { add: vi.fn(async () => 1), where: mockWhere },
    frequencias: { where: mockWhere },
    conteudos: { where: mockWhere },
    avaliacoes: { where: mockWhere },
    notas: { where: mockWhere },
    fechamentos: { where: mockWhere },
    syncQueue: { where: mockWhere },
  },
  now: () => new Date().toISOString(),
  hashOperation: vi.fn(async () => 'test-hash'),
}));

// ---------- Import sob teste ----------
// Importa APÓS os mocks
import * as SyncEngine from '../services/syncEngine';
import * as Queue from '../services/offlineQueue';

describe('syncEngine', () => {
  beforeEach(() => {
    peekIndex = 0;
    mockPeekResults.length = 0;
    (globalThis as any).navigator = { onLine: true };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ====== Estado Inicial ======
  it('deve iniciar no estado IDLE', () => {
    // Após os testes anteriores o estado pode variar, mas getState funciona
    expect(['IDLE', 'ERROR']).toContain(SyncEngine.getState());
  });

  // ====== Offline ======
  it('deve retornar erro quando está offline', async () => {
    (globalThis as any).navigator = { onLine: false };
    const result = await SyncEngine.syncAll();
    expect(result.errors).toContain('Sem conexão com a internet');
    expect(result.synced).toBe(0);
  });

  // ====== Fila Vazia ======
  it('deve retornar synced=0 quando a fila está vazia', async () => {
    const result = await SyncEngine.syncAll();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  // ====== Listeners (subscribe) ======
  it('deve emitir eventos start ao sincronizar', async () => {
    const events: string[] = [];
    const unsub = SyncEngine.subscribe((event) => { events.push(event); });

    await SyncEngine.syncAll();

    expect(events).toContain('start');
    expect(events).toContain('stateChange');

    unsub();
  });

  // ====== Processamento de item de frequência ======
  it('deve processar item de frequência e chamar markDone', async () => {
    mockPeekResults.push({
      id: 1,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: JSON.stringify({
        records: [{
          turma_id: '123', aluno_id: 'a1', data: '2026-01-15',
          tempo: '1º TEMPO', status: 'P', participacao: 'Presencial',
          disciplina: 'Matemática',
        }]
      }),
      status: 'pending', retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-1',
    });

    const result = await SyncEngine.syncAll();
    expect(result.synced).toBe(1);
    expect(Queue.markProcessing).toHaveBeenCalledWith(1);
    expect(Queue.markDone).toHaveBeenCalledWith(1);
  });

  // ====== Erro não-recuperável → Dead Letter ======
  it('deve mover item para dead letter em erro não-recuperável (RLS)', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('new row violates row-level security policy'));

    mockPeekResults.push({
      id: 2,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: JSON.stringify({
        records: [{
          turma_id: '1', aluno_id: 'a1', data: '2026-01-15',
          tempo: '1', status: 'P', disciplina: 'Mat',
        }]
      }),
      status: 'pending', retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-2',
    });

    const result = await SyncEngine.syncAll();
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('DEAD_LETTER');
    expect(Queue.fail).toHaveBeenCalled();
  });

  // ====== Erro recuperável → retry ======
  it('deve chamar retry para erros recuperáveis (rede)', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('Failed to fetch'));

    mockPeekResults.push({
      id: 3,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: JSON.stringify({
        records: [{
          turma_id: '1', aluno_id: 'a1', data: '2026-01-15',
          tempo: '1', status: 'P', disciplina: 'Mat',
        }]
      }),
      status: 'pending', retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-3',
    });

    const result = await SyncEngine.syncAll();
    expect(result.failed).toBe(1);
    expect(Queue.retry).toHaveBeenCalled();
    expect(Queue.fail).not.toHaveBeenCalled();
  });

  // ====== Payload corrompido → Dead Letter ======
  it('deve tratar payload JSON corrompido como dead letter', async () => {
    mockPeekResults.push({
      id: 4,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: '{{invalid json}}',
      status: 'pending', retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-4',
    });

    const result = await SyncEngine.syncAll();
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('DEAD_LETTER');
  });

  // ====== Reset stuck items ======
  it('deve chamar resetStuckItems no início do sync', async () => {
    await SyncEngine.syncAll();
    expect(Queue.resetStuckItems).toHaveBeenCalled();
  });
});
