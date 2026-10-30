// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { db, now } from '../lib/db';

const owner = '00000000-0000-4000-8000-000000000001';
const turma = '00000000-0000-4000-8000-0000000000aa';

const storage = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) || null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
});

vi.mock('../lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'x' } } } })) } } }));
vi.mock('../lib/crypto', () => ({
  getOrCreateKey: vi.fn(async () => ({}) as CryptoKey),
  encryptFields: vi.fn(async (d: Record<string, unknown>) => d),
  decryptFields: vi.fn(async (d: Record<string, unknown>) => ({ data: d, decryptionFailed: false })),
}));

import { saveFrequenciasBulk } from '../services/offlineStorage';
import { setOfflineOwner } from '../services/offlineIdentity';

describe('recuperação de cota', () => {
  beforeEach(async () => {
    await db.open();
    await Promise.all(db.tables.map(t => t.clear()));
    localStorage.setItem('dc_last_user_id', owner);
    setOfflineOwner(owner);
  });
  afterAll(() => db.close());

  it('não perde a chamada quando o IndexedDB sinaliza QuotaExceeded durante o salvamento', async () => {
    // Registro antigo elegível para a limpeza emergencial (clearOldSyncedData).
    const antigo = new Date();
    antigo.setDate(antigo.getDate() - 90);
    await db.frequencias.add({
      turma_id: turma, aluno_id: '00000000-0000-4000-8000-0000000000bb', data: '2026-01-05',
      tempo: '1', status: 'P', participacao: 'Presencial', disciplina: 'MAT',
      syncStatus: 'synced', createdAt: antigo.toISOString(), updatedAt: antigo.toISOString(), version: 1,
    });

    // Simula o primeiro add estourando a cota; depois da limpeza, deve funcionar.
    let chamadas = 0;
    const addOriginal = db.frequencias.add.bind(db.frequencias);
    vi.spyOn(db.frequencias, 'add').mockImplementation(((...args: unknown[]) => {
      chamadas++;
      if (chamadas === 1) {
        return Promise.reject(new DOMException('quota', 'QuotaExceededError'));
      }
      return (addOriginal as (...a: unknown[]) => Promise<unknown>)(...args);
    }) as never);

    const registro = {
      turma_id: turma, aluno_id: '00000000-0000-4000-8000-0000000000cc', data: '2026-05-05',
      tempo: '2', status: 'P', participacao: 'Presencial', disciplina: 'MAT',
    };

    await expect(saveFrequenciasBulk([registro])).resolves.toBeUndefined();
    const salvos = await db.frequencias.toArray();
    expect(salvos.filter(r => r.aluno_id === registro.aluno_id)).toHaveLength(1);
    // O registro antigo foi removido pela limpeza emergencial.
    expect(salvos).toHaveLength(1);
    void now();
  });
});
