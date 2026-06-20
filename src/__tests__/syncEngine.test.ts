import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------- Mock navigator.onLine ----------
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});


// ---------- Mock offlineQueue (inline para hoisting) ----------
vi.mock('../services/offlineQueue', () => {
  const _resetStuckItems = vi.fn(async () => 0);
  const _peek = vi.fn(async () => {
    // Acessa diretamente as variáveis do módulo de teste
    // via import dinâmico — mas vi.mock é hoisted.
    // Workaround: o mock é configurado em beforeEach via __mocks__
    return undefined;
  });
  const _markProcessing = vi.fn(async () => {});
  const _markDone = vi.fn(async () => {});
  const _retry = vi.fn(async () => true);
  const _fail = vi.fn(async () => {});
  const _getAllPending = vi.fn(async () => []);
  const _getPendingCount = vi.fn(async () => 0);

  return {
    resetStuckItems: _resetStuckItems,
    peek: _peek,
    markProcessing: _markProcessing,
    markDone: _markDone,
    retry: _retry,
    fail: _fail,
    getAllPending: _getAllPending,
    getPendingCount: _getPendingCount,
  };
});

// ---------- Mock supabase (inline para hoisting) ----------
vi.mock('../lib/supabase', () => {
  const _upsert = vi.fn(async () => ({ data: null, error: null }));
  const _from = vi.fn(() => ({
    upsert: _upsert,
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(async () => ({ error: null })),
          })),
        })),
      })),
    })),
    insert: vi.fn(async () => ({ data: [{ id: 'server-uuid' }], error: null })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    })),
  }));

  return { supabase: { from: _from } };
});

// ---------- Mock db (inline para hoisting) ----------
vi.mock('../lib/db', () => {
  const _modify = vi.fn(async () => 0);
  const _filter = vi.fn(() => ({ modify: _modify, toArray: vi.fn(async () => []) }));
  const _equals = vi.fn(() => ({
    filter: _filter,
    modify: _modify,
    toArray: vi.fn(async () => []),
  }));
  const _where = vi.fn(() => ({
    equals: _equals,
    below: vi.fn(() => ({ delete: vi.fn(async () => 0) })),
  }));

  return {
    db: {
      syncLogs: { add: vi.fn(async () => 1), where: _where },
      frequencias: { where: _where },
      conteudos: { where: _where },
      avaliacoes: { where: _where },
      notas: { where: _where },
      fechamentos: { where: _where },
      syncQueue: { where: _where },
    },
    now: () => new Date().toISOString(),
    hashOperation: vi.fn(async () => 'test-hash'),
  };
});

// ---------- Import sob teste (APÓS mocks) ----------
import * as SyncEngine from '../services/syncEngine';
import * as Queue from '../services/offlineQueue';
import { supabase } from '../lib/supabase';

// Helper para configurar peek com resultados sequenciais
function setupPeek(items: any[]) {
  let idx = 0;
  vi.mocked(Queue.peek).mockImplementation(async () => items[idx++] || undefined);
}

// Helper para forçar upsert a falhar
function forceUpsertError(msg: string) {
  const fromMock = vi.mocked(supabase.from);
  fromMock.mockReturnValueOnce({
    upsert: vi.fn(async () => { throw new Error(msg); }),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })) })) })) })),
    insert: vi.fn(async () => ({ data: [{ id: 'x' }], error: null })),
    select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn(async () => ({ data: null, error: null })) })) })),
    update: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
  } as any);
}

function makeFreqItem(id: number, payload?: any) {
  return {
    id,
    table: 'frequencias',
    operation: 'UPSERT',
    payload: JSON.stringify(payload ?? {
      records: [{
        turma_id: '1', aluno_id: 'a1', data: '2026-01-15',
        tempo: '1', status: 'P', participacao: 'Presencial', disciplina: 'Mat',
      }],
    }),
    status: 'pending', retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hash: `hash-${id}`,
  };
}

describe('syncEngine', () => {
  beforeEach(() => {
    (globalThis as any).navigator = { onLine: true };
    vi.clearAllMocks();
    // Reset peek para retornar undefined (fila vazia)
    vi.mocked(Queue.peek).mockResolvedValue(undefined);
  });

  it('deve retornar erro quando está offline', async () => {
    (globalThis as any).navigator = { onLine: false };
    const result = await SyncEngine.syncAll();
    expect(result.errors).toContain('Sem conexão com a internet');
  });

  it('deve retornar synced=0 quando a fila está vazia', async () => {
    const result = await SyncEngine.syncAll();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('deve emitir evento start ao sincronizar', async () => {
    const events: string[] = [];
    const unsub = SyncEngine.subscribe((event) => events.push(event));
    await SyncEngine.syncAll();
    expect(events).toContain('start');
    unsub();
  });

  it('deve processar item de frequência e chamar markDone', async () => {
    const item = makeFreqItem(1);
    setupPeek([item]);

    const result = await SyncEngine.syncAll();
    expect(result.synced).toBe(1);
    expect(Queue.markProcessing).toHaveBeenCalledWith(1);
    expect(Queue.markDone).toHaveBeenCalledWith(1);
  });

  it('deve mover item para dead letter em erro não-recuperável (RLS)', async () => {
    const item = makeFreqItem(2);
    setupPeek([item]);
    forceUpsertError('new row violates row-level security policy');

    const result = await SyncEngine.syncAll();
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('DEAD_LETTER');
    expect(Queue.fail).toHaveBeenCalled();
  });

  it('deve chamar retry para erros recuperáveis (rede)', async () => {
    const item = makeFreqItem(3);
    setupPeek([item]);
    forceUpsertError('Failed to fetch');

    const result = await SyncEngine.syncAll();
    expect(result.failed).toBe(1);
    expect(Queue.retry).toHaveBeenCalled();
    expect(Queue.fail).not.toHaveBeenCalled();
  });

  it('deve tratar payload JSON corrompido como dead letter', async () => {
    setupPeek([{
      id: 4, table: 'frequencias', operation: 'UPSERT',
      payload: '{{invalid json}}',
      status: 'pending', retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-4',
    }]);

    const result = await SyncEngine.syncAll();
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('DEAD_LETTER');
  });

  it('deve chamar resetStuckItems no início do sync', async () => {
    await SyncEngine.syncAll();
    expect(Queue.resetStuckItems).toHaveBeenCalled();
  });
});
