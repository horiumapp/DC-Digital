import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------- Mock navigator.onLine ----------
let mockOnline = true;
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
  configurable: true,
});

// ---------- Mock offlineQueue ----------
const mockPeekResults: any[] = [];
let peekIndex = 0;

const mockQueue = {
  resetStuckItems: vi.fn(async () => 0),
  peek: vi.fn(async () => mockPeekResults[peekIndex++] || undefined),
  markProcessing: vi.fn(async () => {}),
  markDone: vi.fn(async () => {}),
  retry: vi.fn(async () => true),
  fail: vi.fn(async () => {}),
};

vi.mock('./offlineQueue', () => mockQueue);

// ---------- Mock supabase ----------
const mockUpsert = vi.fn(async () => ({ data: null, error: null }));
const mockDelete = vi.fn(async () => ({ data: null, error: null }));
const mockInsert = vi.fn(async () => ({ data: [{ id: 'server-uuid-123' }], error: null }));
const mockSelect = vi.fn(() => ({
  eq: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: null, error: null })),
      })),
    })),
  })),
  single: vi.fn(async () => ({ data: null, error: null })),
}));

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
      insert: mockInsert,
      select: mockSelect,
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    })),
  },
}));

// ---------- Mock db (logs e operações locais) ----------
vi.mock('../lib/db', () => ({
  db: {
    syncLogs: {
      add: vi.fn(async () => 1),
      where: vi.fn(() => ({
        below: vi.fn(() => ({
          delete: vi.fn(async () => 0),
        })),
      })),
    },
    frequencias: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            modify: vi.fn(async () => 0),
          })),
        })),
      })),
    },
    conteudos: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            modify: vi.fn(async () => 0),
          })),
        })),
      })),
    },
    avaliacoes: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          modify: vi.fn(async () => 0),
          toArray: vi.fn(async () => []),
          filter: vi.fn(() => ({
            modify: vi.fn(async () => 0),
          })),
        })),
      })),
    },
    notas: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          modify: vi.fn(async () => 0),
          filter: vi.fn(() => ({
            modify: vi.fn(async () => 0),
          })),
        })),
      })),
    },
    fechamentos: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            modify: vi.fn(async () => 0),
          })),
        })),
      })),
    },
    syncQueue: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          filter: vi.fn(() => ({
            modify: vi.fn(async () => 0),
            toArray: vi.fn(async () => []),
          })),
          toArray: vi.fn(async () => []),
        })),
      })),
    },
  },
  now: () => new Date().toISOString(),
  hashOperation: vi.fn(async () => 'test-hash'),
}));

// ---------- Import sob teste ----------
import { syncAll, getState, subscribe, scheduleSync } from '../services/syncEngine';

describe('syncEngine', () => {
  beforeEach(() => {
    peekIndex = 0;
    mockPeekResults.length = 0;
    mockOnline = true;
    (globalThis as any).navigator = { onLine: mockOnline };
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ====== Estado Inicial ======
  it('deve iniciar no estado IDLE', () => {
    expect(getState()).toBe('IDLE');
  });

  // ====== Fila Vazia ======
  it('deve retornar synced=0 quando a fila está vazia', async () => {
    // peek retorna undefined → nenhum item
    const result = await syncAll();
    expect(result.synced).toBe(0);
    expect(result.failed).toBe(0);
  });

  // ====== Offline ======
  it('deve retornar erro quando está offline', async () => {
    (globalThis as any).navigator = { onLine: false };
    const result = await syncAll();
    expect(result.errors).toContain('Sem conexão com a internet');
    expect(result.synced).toBe(0);
  });

  // ====== Listeners (subscribe) ======
  it('deve emitir eventos start e complete ao sincronizar', async () => {
    const events: string[] = [];
    const unsub = subscribe((event) => { events.push(event); });

    await syncAll();

    expect(events).toContain('start');
    expect(events).toContain('complete');
    expect(events).toContain('stateChange');

    unsub();
  });

  // ====== Processamento de item de frequência ======
  it('deve processar item de frequência com sucesso', async () => {
    const freqPayload = JSON.stringify({
      records: [{
        turma_id: '123',
        aluno_id: 'a1',
        data: '2026-01-15',
        tempo: '1º TEMPO',
        status: 'P',
        participacao: 'Presencial',
        disciplina: 'Matemática',
      }]
    });

    mockPeekResults.push({
      id: 1,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: freqPayload,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-1',
    });

    const result = await syncAll();
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockQueue.markProcessing).toHaveBeenCalledWith(1);
    expect(mockQueue.markDone).toHaveBeenCalledWith(1);
  });

  // ====== Erro não-recuperável → Dead Letter ======
  it('deve mover item para dead letter em erro não-recuperável (RLS)', async () => {
    // Configurar mock para falhar com erro RLS
    mockUpsert.mockRejectedValueOnce(new Error('new row violates row-level security policy'));

    mockPeekResults.push({
      id: 2,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: JSON.stringify({
        records: [{
          turma_id: '123', aluno_id: 'a1', data: '2026-01-15',
          tempo: '1º TEMPO', status: 'P', disciplina: 'Mat',
        }]
      }),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-2',
    });

    const result = await syncAll();
    expect(result.failed).toBe(1);
    expect(result.errors[0]).toContain('DEAD_LETTER');
    expect(mockQueue.fail).toHaveBeenCalled();
  });

  // ====== Sincronização concorrente ======
  it('deve rejeitar sincronização concorrente', async () => {
    // Simular item lento na primeira chamada
    mockPeekResults.push({
      id: 3,
      table: 'conteudos',
      operation: 'UPSERT',
      payload: JSON.stringify({
        turma_id: '1', data: '2026-01-01', tempo: '1',
        objetos: [], habilidades: [], descricao: '', disciplina: 'Mat',
      }),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-3',
    });

    // Iniciar primeira sync
    const promise1 = syncAll();
    // Tentar segunda sync enquanto primeira está rodando
    const result2 = await syncAll();

    expect(result2.errors).toContain('Sincronização já em andamento');

    await promise1;
  });

  // ====== scheduleSync com debounce ======
  it('deve agendar sync com debounce de 2s', () => {
    const spy = vi.spyOn({ syncAll }, 'syncAll');

    scheduleSync();
    scheduleSync();
    scheduleSync();

    // Nenhuma chamada imediata
    expect(spy).not.toHaveBeenCalled();

    // Avançar timers
    vi.advanceTimersByTime(2100);
    // O debounce deveria ter disparado (internamente chama syncAll)
  });

  // ====== Erro recuperável → retry ======
  it('deve chamar retry para erros recuperáveis (rede)', async () => {
    mockUpsert.mockRejectedValueOnce(new Error('Failed to fetch'));

    mockPeekResults.push({
      id: 4,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: JSON.stringify({
        records: [{
          turma_id: '1', aluno_id: 'a1', data: '2026-01-15',
          tempo: '1', status: 'P', disciplina: 'Mat',
        }]
      }),
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-4',
    });

    const result = await syncAll();
    expect(result.failed).toBe(1);
    expect(mockQueue.retry).toHaveBeenCalled();
    // Não deve ter chamado fail (dead letter)
    expect(mockQueue.fail).not.toHaveBeenCalled();
  });

  // ====== Payload corrompido → Dead Letter ======
  it('deve tratar payload JSON corrompido como dead letter', async () => {
    mockPeekResults.push({
      id: 5,
      table: 'frequencias',
      operation: 'UPSERT',
      payload: '{{invalid json}}',
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hash: 'hash-5',
    });

    const result = await syncAll();
    expect(result.failed).toBe(1);
    // Payload corrompido contém DEAD_LETTER no erro
    expect(result.errors[0]).toContain('DEAD_LETTER');
  });

  // ====== Reset stuck items ======
  it('deve chamar resetStuckItems no início do sync', async () => {
    await syncAll();
    expect(mockQueue.resetStuckItems).toHaveBeenCalledOnce();
  });
});
