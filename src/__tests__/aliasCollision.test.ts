// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, afterEach, afterAll, describe, it, expect, vi } from 'vitest';

const mock = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn() }));
vi.mock('../lib/supabase', () => ({ supabase: { rpc: mock.rpc, auth: { getSession: mock.session, refreshSession: vi.fn(async () => ({ error: null })) } } }));
vi.mock('../utils/network', () => ({ pingInternet: vi.fn(async () => true), pingSupabase: vi.fn(async () => true) }));

import { db, now } from '../lib/db';
import * as Queue from '../services/offlineQueue';
import { syncAll, cancelSync } from '../services/syncEngine';
import { setOfflineOwner } from '../services/offlineIdentity';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) || null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});

const owner = '00000000-0000-0000-0000-000000000001';
const aluno = '00000000-0000-0000-0000-000000000002';

describe('colisão entre localId e id do servidor', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map(t => t.clear()));
    storage.set('dc_last_user_id', owner);
    setOfflineOwner(owner);
    mock.session.mockResolvedValue({ data: { session: { user: { id: owner } } }, error: null });
    mock.rpc.mockReset();
  });
  afterEach(() => cancelSync());
  afterAll(() => db.close());

  it('não reescreve notas de avaliação do servidor quando o localId coincide com o id remoto', async () => {
    // Avaliação antiga já sincronizada. O id de servidor é um BIGINT pequeno
    // (a sequência começa em 1), então ele pode coincidir com o localId.
    await db.avaliacoes.add({
      id: '2', serverId: '2', turma_id: owner, tipo: 'AV01', data: '2026-03-01',
      instrumento: 'Prova', objetos: [], bimestre: '1. BIMESTRE', valor_maximo: 10,
      disciplina: 'MAT', syncStatus: 'synced', version: 1, serverRevision: 2,
      createdAt: now(), updatedAt: now(),
    });
    const notaAntiga = await db.notas.add({
      avaliacao_id: '2', aluno_id: aluno, valor: 9,
      syncStatus: 'synced', version: 1, createdAt: now(), updatedAt: now(),
    });

    // Nova avaliação offline: o autoincremento do Dexie chega a 2, o mesmo
    // número do id de servidor da avaliação acima.
    const localId = await db.avaliacoes.add({
      id: 'temp_nova', clientTempId: 'temp_nova', turma_id: owner, tipo: 'AV02',
      data: '2026-04-01', instrumento: 'Prova', objetos: [], bimestre: '1. BIMESTRE',
      valor_maximo: 10, disciplina: 'MAT', syncStatus: 'pending', version: 1,
      createdAt: now(), updatedAt: now(),
    });
    expect(localId).toBe(2);
    await Queue.enqueue('avaliacoes', 'INSERT', {
      id: 'temp_nova', turma_id: owner, tipo: 'AV02', data: '2026-04-01',
      instrumento: 'Prova', objetos: [], bimestre: '1. BIMESTRE',
      valor_maximo: 10, disciplina: 'MAT',
    }, localId);

    mock.rpc.mockReturnValue({
      abortSignal: () => Promise.resolve({
        data: [{ id: '77', clientTempId: 'temp_nova', turma_id: owner, tipo: 'AV02', data: '2026-04-01', disciplina: 'MAT', bimestre: '1. BIMESTRE', valor_maximo: 10, instrumento: 'Prova', objetos: [], sync_revision: 1 }],
        error: null,
      }),
    });

    const resultado = await syncAll();

    expect(resultado.synced).toBe(1);
    // A nota da avaliação 2 do servidor deve continuar apontando para '2'.
    expect((await db.notas.get(notaAntiga))?.avaliacao_id).toBe('2');
  });
});
