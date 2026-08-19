/**
 * offlineStorage.ts — Camada CRUD sobre o IndexedDB (Dexie)
 * 
 * Todas as operações CRUD do app passam por aqui.
 * Escreve localmente com syncStatus='pending' e enfileira para sincronização.
 */
import Dexie from 'dexie';
import { db, now, hashOperation, OPERATIONAL_TABLE_NAMES, getOperationalTable, type SyncStatus } from '../lib/db';
import { supabase } from '../lib/supabase';
import { encryptFields, decryptFields, getOrCreateKey } from '../lib/crypto';
import { getTid } from '../utils/turmaUtils';
import * as Queue from './offlineQueue';
import type {
  LocalFrequencia,
  LocalConteudo,
  LocalAvaliacao,
  LocalNota,
  LocalFechamento,
  LocalAluno,
  LocalTurma,
  LocalHorario,
  CachedUser,
  LocalFile,
  LocalCurriculoUnidade,
} from '../lib/db';

// ============================================================
// Tipos genéricos
// ============================================================

// FIX #16: Helper para tratamento de QuotaExceededError no IndexedDB.
// Quando o armazenamento ficar cheio, faz limpeza emergencial e retenta.
async function withQuotaRecovery<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: unknown) {
    const isQuotaError = err instanceof DOMException && (
      err.name === 'QuotaExceededError' ||
      err.code === 22  // Safari
    );
    if (isQuotaError) {
      console.warn('[offlineStorage] QuotaExceeded — executando limpeza emergencial...');
      try {
        const deleted = await clearOldSyncedData(30); // Limpa registros >30 dias
        console.log(`[offlineStorage] Limpeza emergencial: ${deleted} registros removidos`);
        return await operation(); // Retenta após limpeza
      } catch {
        try {
          const oldFiles = await db.files.where('syncStatus').equals('synced').toArray();
          if (oldFiles.length > 0) {
            const fileIds = oldFiles.map(f => f.localId).filter((id): id is number => id !== undefined);
            await db.files.bulkDelete(fileIds);
            console.log(`[offlineStorage] Limpeza emergencial de arquivos: ${fileIds.length} blobs removidos`);
          }
          return await operation();
        } catch (filesErr) {
          console.error('[offlineStorage] Falha mesmo após limpeza emergencial de arquivos:', filesErr);
          throw filesErr;
        }
      }
    }
    throw err;
  }
}



// ============================================================
// Turmas (cache somente leitura)
// ============================================================

export async function cacheTurmas(turmas: Omit<LocalTurma, 'syncStatus' | 'updatedAt'>[]): Promise<void> {
  const records = turmas.map(t => ({
    ...t,
    syncStatus: 'synced' as SyncStatus,
    updatedAt: now(),
  }));
  await db.turmas.bulkPut(records);
}

export async function getCachedTurmas(escolaId?: string): Promise<LocalTurma[]> {
  if (escolaId) {
    return db.turmas.where('escola_id').equals(escolaId).toArray();
  }
  return db.turmas.toArray();
}

// ============================================================
// Currículo BNCC (cache somente leitura)
// ============================================================

export type CurriculoCacheKey = Pick<LocalCurriculoUnidade, 'modalidade' | 'ano' | 'bimestre' | 'disciplina'>;

export async function cacheCurriculo(unidades: Omit<LocalCurriculoUnidade, 'updatedAt'>[]): Promise<void> {
  await db.curriculos.bulkPut(unidades.map(unidade => ({
    ...unidade,
    updatedAt: now(),
  })));
}

export async function getCachedCurriculo(chave: CurriculoCacheKey): Promise<LocalCurriculoUnidade[]> {
  return db.curriculos
    .where('[modalidade+ano+bimestre+disciplina]')
    .equals([chave.modalidade, chave.ano, chave.bimestre, chave.disciplina])
    .toArray();
}

// ============================================================
// Alunos (cache somente leitura)
// ============================================================

async function getCryptoKey(): Promise<CryptoKey | null> {
  try {
    let userId: string | undefined;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    } catch {
      // Ignora erro de rede/sessão
    }

    // FIX C5: Sem userId da sessão, NÃO buscar usuário arbitrário do cache.
    // Em dispositivos compartilhados, getCachedUser() sem userId pode retornar
    // o usuário errado, levando a uso da chave cripto incorreta.
    if (!userId) return null;
    return await getOrCreateKey(userId);
  } catch (err) {
    console.error('[offlineStorage] Failed to get encryption key:', err);
    return null;
  }
}

export async function cacheAlunos(alunos: Omit<LocalAluno, 'syncStatus' | 'updatedAt'>[]): Promise<void> {
  const key = await getCryptoKey();
  if (!key) {
    throw new Error('Chave de criptografia não disponível. Operação cancelada por segurança de dados (LGPD).');
  }
  const records = await Promise.all(alunos.map(async a => {
    const record = {
      ...a,
      turma_id: getTid(a.turma_id),
      syncStatus: 'synced' as SyncStatus,
      updatedAt: now(),
    };
    // Cast seguro: encryptFields apenas lê/escreve campos por nome
    const encrypted = await encryptFields(record as unknown as Record<string, unknown>, ['nome', 'cpf'], key);
    return encrypted as unknown as LocalAluno;
  }));
  await db.alunos.bulkPut(records);
}

export async function getCachedAlunos(turmaId: string): Promise<{ alunos: LocalAluno[]; decryptionFailed: boolean }> {
  const key = await getCryptoKey();
  const tid = getTid(turmaId);
  const local = await db.alunos.where('turma_id').equals(tid).toArray();
  if (!key) return { alunos: local, decryptionFailed: false };
  let anyDecryptionFailed = false;
  const result = await Promise.all(local.map(async a => {
    // FIX #3: decryptFields agora retorna { data, decryptionFailed }
    const { data: decrypted, decryptionFailed } = await decryptFields(a as unknown as Record<string, unknown>, ['nome', 'cpf'], key);
    if (decryptionFailed) anyDecryptionFailed = true;
    return decrypted as unknown as LocalAluno;
  }));
  if (anyDecryptionFailed) {
    console.warn('[offlineStorage] Descriptografia falhou para alguns alunos. Dados precisam ser re-cacheados do servidor.');
    // FIX #1: Limpar o cache corrompido para forçar re-fetch do servidor no próximo acesso online.
    // Manter dados cifrados irrecuperáveis no IndexedDB não tem utilidade.
    try {
      await db.alunos.where('turma_id').equals(tid).delete();
      console.info('[offlineStorage] Cache de alunos da turma limpo — será re-sincronizado quando online.');
    } catch (clearErr) {
      console.error('[offlineStorage] Falha ao limpar cache de alunos com chave corrompida:', clearErr);
    }
  }
  // FIX: Retorna flag decryptionFailed para que o chamador possa avisar o usuário
  // em vez de exibir silenciosamente '[DADOS PROTEGIDOS - RECONECTE PARA ATUALIZAR]'.
  return { alunos: result, decryptionFailed: anyDecryptionFailed };
}

// ============================================================
// Frequências
// ============================================================

export async function saveFrequenciaLocal(data: Omit<LocalFrequencia, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<number> {
  return withQuotaRecovery(async () => {
    const tid = getTid(data.turma_id);
    const normalizedData = { ...data, turma_id: tid };
    // Tenta encontrar registro existente pela chave composta
    const existing = await db.frequencias
      .where('[turma_id+aluno_id+data+tempo+disciplina]')
      .equals([tid, normalizedData.aluno_id, normalizedData.data, normalizedData.tempo, normalizedData.disciplina])
      .first();

    const timestamp = now();

    if (existing && existing.localId) {
      await db.frequencias.update(existing.localId, {
        ...normalizedData,
        syncStatus: 'pending',
        updatedAt: timestamp,
        version: (existing.version || 0) + 1,
      });
      return existing.localId;
    }

    return await db.frequencias.add({
      ...normalizedData,
      syncStatus: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    }) as number;
  });
}

export async function saveFrequenciasBulk(
  records: Omit<LocalFrequencia, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]
): Promise<void> {
  if (records.length === 0) return;
  // FIX M4: Envolver em withQuotaRecovery — esta é a operação que salva mais dados
  // de uma vez, sendo a mais propensa a QuotaExceeded.
  return withQuotaRecovery(async () => {
    const timestamp = now();
    const normalizedRecords = records.map(r => ({ ...r, turma_id: getTid(r.turma_id) }));

    // FIX #6: Validar invariante do batch — todos os records devem ter mesma data/tempo/disciplina.
    // Caso contrário, a otimização de busca abaixo retornaria resultados incorretos.
    const first = normalizedRecords[0];
    const invariantViolation = normalizedRecords.some(
      r => r.data !== first.data || r.tempo !== first.tempo || r.disciplina !== first.disciplina
    );
    if (invariantViolation) {
      console.error('[offlineStorage] saveFrequenciasBulk: batch contém records com data/tempo/disciplina distintos. Use saveFrequenciaLocal para registros individuais.');
      throw new Error('saveFrequenciasBulk requer que todos os records tenham a mesma data, tempo e disciplina.');
    }

    await db.transaction('rw', db.frequencias, async () => {
      const existingRecords = await db.frequencias
        .where('turma_id')
        .equals(first.turma_id)
        .filter(f => f.data === first.data && f.tempo === first.tempo && f.disciplina === first.disciplina)
        .toArray();

      const existingMap = new Map<string, LocalFrequencia>();
      for (const r of existingRecords) {
        const key = `${r.aluno_id}`;
        existingMap.set(key, r);
      }

      for (const data of normalizedRecords) {
        const existing = existingMap.get(data.aluno_id);

        if (existing && existing.localId) {
          await db.frequencias.update(existing.localId, {
            ...data,
            syncStatus: 'pending',
            updatedAt: timestamp,
            version: (existing.version || 0) + 1,
          });
        } else {
          await db.frequencias.add({
            ...data,
            syncStatus: 'pending',
            createdAt: timestamp,
            updatedAt: timestamp,
            version: 1,
          });
        }
      }
    });
  });
}

export async function getFrequenciasLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<LocalFrequencia[]> {
  const tid = getTid(turmaId);
  return db.frequencias
    .where('turma_id').equals(tid)
    .filter(f => f.disciplina === disciplina && f.data === data && f.tempo === tempo)
    .toArray();
}

export async function getAllFrequenciasLocal(turmaId: string, disciplina?: string): Promise<LocalFrequencia[]> {
  const tid = getTid(turmaId);
  const query = db.frequencias.where('turma_id').equals(tid);
  if (disciplina) {
    return query.filter(f => f.disciplina.toLowerCase() === disciplina.toLowerCase()).toArray();
  }
  return query.toArray();
}

export async function deleteFrequenciasLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<void> {
  const tid = getTid(turmaId);
  await db.transaction('rw', [db.frequencias, db.syncQueue], async () => {
    const records = await db.frequencias
      .where('[turma_id+aluno_id+data+tempo+disciplina]')
      .between(
        [tid, Dexie.minKey, data, tempo, disciplina],
        [tid, Dexie.maxKey, data, tempo, disciplina]
      )
      .toArray();

    const ids = records.map(r => r.localId).filter((id): id is number => id !== undefined);
    if (ids.length > 0) {
      await db.frequencias.bulkDelete(ids);
    }

    // Purgar operações pendentes de UPSERT na fila para evitar ressuscitar frequência deletada offline
    const pendingQueueItems = await db.syncQueue
      .where('table').equals('frequencias')
      .filter(item => item.status === 'pending')
      .toArray();

    for (const item of pendingQueueItems) {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(item.payload);
      } catch {
        continue;
      }

      if (Array.isArray(payload.records)) {
        const remaining = payload.records.filter((r: Record<string, unknown>) => {
          return !(
            getTid(String(r.turma_id)) === tid &&
            r.data === data &&
            r.tempo === tempo &&
            r.disciplina === disciplina
          );
        });

        if (remaining.length === 0) {
          if (item.id !== undefined) await db.syncQueue.delete(item.id);
        } else if (remaining.length !== payload.records.length) {
          payload.records = remaining;
          if (item.id !== undefined) {
            await db.syncQueue.update(item.id, {
              payload: JSON.stringify(payload),
              updatedAt: now(),
            });
          }
        }
      } else if (
        getTid(String(payload.turma_id)) === tid &&
        payload.data === data &&
        payload.tempo === tempo &&
        payload.disciplina === disciplina &&
        item.operation === 'UPSERT'
      ) {
        if (item.id !== undefined) await db.syncQueue.delete(item.id);
      }
    }
  });
}

/** Cache frequências vindas do servidor (marca como synced) */
export async function cacheFrequencias(turmaId: string, records: Omit<LocalFrequencia, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  if (records.length === 0) return;
  const tid = getTid(turmaId);
  const timestamp = now();

  // FIX #19: Buscar todos os registros existentes da turma de uma vez
  // em vez de fazer N queries .where().first() dentro do loop (padrão N+1).
  const existingRecords = await db.frequencias
    .where('turma_id').equals(tid)
    .toArray();

  const existingMap = new Map<string, LocalFrequencia>();
  for (const r of existingRecords) {
    const key = `${r.aluno_id}|${r.data}|${r.tempo}|${r.disciplina}`;
    existingMap.set(key, r);
  }

  await db.transaction('rw', db.frequencias, async () => {
    for (const rawData of records) {
      const data = { ...rawData, turma_id: tid };
      const key = `${data.aluno_id}|${data.data}|${data.tempo}|${data.disciplina}`;
      const existing = existingMap.get(key);

      if (existing && existing.localId) {
        // Só sobrescreve se não tem alteração local pendente
        if (existing.syncStatus !== 'pending') {
          await db.frequencias.update(existing.localId, {
            ...data,
            syncStatus: 'synced',
            updatedAt: timestamp,
            version: (existing.version || 0),
          });
        }
      } else {
        await db.frequencias.add({
          ...data,
          turma_id: tid,
          syncStatus: 'synced',
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        });
      }
    }
  });
}

// ============================================================
// Conteúdos
// ============================================================

export async function saveConteudoLocal(data: Omit<LocalConteudo, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<number> {
  // FIX #9: Envolver em withQuotaRecovery para recuperação automática quando IndexedDB estiver cheio
  return withQuotaRecovery(async () => {
    const tid = getTid(data.turma_id);
    const normalizedData = { ...data, turma_id: tid };
    const existing = await db.conteudos
      .where('[turma_id+data+tempo+disciplina]')
      .equals([tid, normalizedData.data, normalizedData.tempo, normalizedData.disciplina])
      .first();

    const timestamp = now();

    if (existing && existing.localId) {
      await db.conteudos.update(existing.localId, {
        ...normalizedData,
        syncStatus: 'pending',
        updatedAt: timestamp,
        version: (existing.version || 0) + 1,
      });
      return existing.localId;
    }

    return await db.conteudos.add({
      ...normalizedData,
      syncStatus: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    }) as number;
  });
}

export async function getConteudoLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<LocalConteudo | undefined> {
  const tid = getTid(turmaId);
  return db.conteudos
    .where('[turma_id+data+tempo+disciplina]')
    .equals([tid, data, tempo, disciplina])
    .first();
}

export async function getAllConteudosLocal(turmaId: string, disciplina?: string): Promise<LocalConteudo[]> {
  const tid = getTid(turmaId);
  const query = db.conteudos.where('turma_id').equals(tid);
  if (disciplina) {
    return query.filter(c => c.disciplina.toLowerCase() === disciplina.toLowerCase()).toArray();
  }
  return query.toArray();
}

export async function deleteConteudoLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<void> {
  const tid = getTid(turmaId);
  await db.transaction('rw', [db.conteudos, db.syncQueue], async () => {
    const record = await db.conteudos
      .where('[turma_id+data+tempo+disciplina]')
      .equals([tid, data, tempo, disciplina])
      .first();
    if (!record?.localId) return;

    // Purgar qualquer operação pendente de UPSERT para este conteúdo na fila
    const pendingQueueItems = await db.syncQueue
      .where('table').equals('conteudos')
      .filter(item => item.status === 'pending')
      .toArray();

    for (const item of pendingQueueItems) {
      try {
        const payload = JSON.parse(item.payload);
        if (
          getTid(String(payload.turma_id)) === tid &&
          payload.data === data &&
          payload.tempo === tempo &&
          payload.disciplina === disciplina &&
          item.operation === 'UPSERT'
        ) {
          if (item.id !== undefined) await db.syncQueue.delete(item.id);
        }
      } catch {
        continue;
      }
    }

    // FIX C3: Apenas enfileirar DELETE se o registro JÁ FOI sincronizado com o servidor.
    if (record.syncStatus !== 'pending') {
      await Queue.enqueue('conteudos', 'DELETE', {
        turma_id: record.turma_id,
        data: record.data,
        tempo: record.tempo,
        disciplina: record.disciplina,
      });
    }

    await db.conteudos.delete(record.localId);
  });
}

export async function cacheConteudos(turmaId: string, records: Omit<LocalConteudo, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  if (records.length === 0) return;
  const tid = getTid(turmaId);
  const timestamp = now();

  // FIX: Buscar todos os registros existentes da turma de uma vez
  // em vez de N queries .where().first() dentro do loop (padrão N+1).
  const existingRecords = await db.conteudos
    .where('turma_id').equals(tid)
    .toArray();

  const existingMap = new Map<string, LocalConteudo>();
  for (const r of existingRecords) {
    const key = `${r.data}|${r.tempo}|${r.disciplina}`;
    existingMap.set(key, r);
  }

  await db.transaction('rw', db.conteudos, async () => {
    for (const rawData of records) {
      const data = { ...rawData, turma_id: tid };
      const key = `${data.data}|${data.tempo}|${data.disciplina}`;
      const existing = existingMap.get(key);

      if (existing && existing.localId) {
        if (existing.syncStatus !== 'pending') {
          await db.conteudos.update(existing.localId, {
            ...data,
            syncStatus: 'synced',
            updatedAt: timestamp,
            version: existing.version || 1,
          });
        }
      } else {
        await db.conteudos.add({
          ...data,
          turma_id: tid,
          syncStatus: 'synced',
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        });
      }
    }
  });
}

// ============================================================
// Avaliações
// ============================================================

export async function saveAvaliacaoLocal(data: Omit<LocalAvaliacao, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<number> {
  // FIX #9: Envolver em withQuotaRecovery para recuperação automática quando IndexedDB estiver cheio
  return withQuotaRecovery(async () => {
    const tid = getTid(data.turma_id);
    const normalizedData = { ...data, turma_id: tid };
    const timestamp = now();

    // Se tem server ID, atualizar registro existente
    if (normalizedData.id) {
      const existing = await db.avaliacoes.where('id').equals(normalizedData.id).first();
      if (existing?.localId) {
        await db.avaliacoes.update(existing.localId, {
          ...normalizedData,
          syncStatus: 'pending',
          updatedAt: timestamp,
          version: (existing.version || 0) + 1,
        });
        return existing.localId;
      }
    }

    return await db.avaliacoes.add({
      ...normalizedData,
      syncStatus: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    }) as number;
  });
}

export async function getAvaliacoesLocal(turmaId: string, disciplina?: string): Promise<LocalAvaliacao[]> {
  const tid = getTid(turmaId);
  const query = db.avaliacoes.where('turma_id').equals(tid);
  if (disciplina) {
    return query.filter(a => a.disciplina.toLowerCase() === disciplina.toLowerCase()).toArray();
  }
  return query.toArray();
}

export async function deleteAvaliacaoLocal(id: string): Promise<void> {
  const record = await db.avaliacoes
    .filter(avaliacao => {
      const localId = avaliacao.localId;
      return avaliacao.id === id
        || avaliacao.clientTempId === id
        || avaliacao.serverId === id
        || (localId !== undefined && (
          String(localId) === id || `temp_${localId}` === id || `local_${localId}` === id
        ));
    })
    .first();

  if (!record?.localId) return;

  const avaliacaoAliases = new Set(
    [id, record.id, record.clientTempId, record.serverId, String(record.localId), `temp_${record.localId}`, `local_${record.localId}`]
      .filter((value): value is string => Boolean(value))
  );

  await db.transaction('rw', [db.avaliacoes, db.notas, db.syncQueue], async () => {
    const notas = await db.notas
      .filter(nota => avaliacaoAliases.has(String(nota.avaliacao_id)))
      .toArray();
    const notaIds = notas.map(nota => nota.localId).filter((localId): localId is number => localId !== undefined);
    if (notaIds.length > 0) await db.notas.bulkDelete(notaIds);

    const queueItems = await db.syncQueue.toArray();
    for (const item of queueItems) {
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(item.payload) as Record<string, unknown>;
      } catch {
        payload = {};
      }

      const isAvaliacaoOperation = item.table === 'avaliacoes'
        && (item.localId === record.localId || avaliacaoAliases.has(String(payload.id)));
      if (isAvaliacaoOperation) {
        if (item.id !== undefined) await db.syncQueue.delete(item.id);
        continue;
      }

      if (item.table !== 'notas') continue;

      const records = Array.isArray(payload.records) ? payload.records : null;
      if (records) {
        const remainingRecords = records.filter(value => {
          if (!value || typeof value !== 'object') return true;
          return !avaliacaoAliases.has(String((value as Record<string, unknown>).avaliacao_id));
        });
        if (remainingRecords.length === records.length) continue;
        if (remainingRecords.length === 0) {
          if (item.id !== undefined) await db.syncQueue.delete(item.id);
          continue;
        }
        payload.records = remainingRecords;
      } else if (avaliacaoAliases.has(String(payload.avaliacao_id))) {
        if (item.id !== undefined) await db.syncQueue.delete(item.id);
        continue;
      } else {
        continue;
      }

      if (item.id !== undefined) {
        await db.syncQueue.update(item.id, {
          payload: JSON.stringify(payload),
          hash: await hashOperation(item.table, item.operation, payload),
          updatedAt: now(),
        });
      }
    }

    await db.avaliacoes.delete(record.localId);
  });
}

export async function cacheAvaliacoes(records: Array<Omit<LocalAvaliacao, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'> & { id: string }>): Promise<void> {
  if (records.length === 0) return;
  const timestamp = now();

  // FIX: Buscar todos os registros existentes de uma vez (evita N+1 queries no loop)
  const ids = records.map(r => r.id);
  const existingRecords = await db.avaliacoes.where('id').anyOf(ids).toArray();
  const existingMap = new Map<string, LocalAvaliacao>();
  for (const r of existingRecords) {
    if (r.id) existingMap.set(r.id, r);
  }

  await db.transaction('rw', db.avaliacoes, async () => {
    for (const data of records) {
      const existing = existingMap.get(data.id);
      if (existing?.localId) {
        if (existing.syncStatus !== 'pending') {
          await db.avaliacoes.update(existing.localId, {
            ...data,
            syncStatus: 'synced',
            updatedAt: timestamp,
            version: existing.version || 1,
          });
        }
      } else {
        await db.avaliacoes.add({
          ...data,
          syncStatus: 'synced',
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        });
      }
    }
  });
}

// ============================================================
// Notas
// ============================================================

export async function saveNotasLocal(records: Omit<LocalNota, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  // FIX #9: Envolver em withQuotaRecovery para recuperação automática quando IndexedDB estiver cheio
  return withQuotaRecovery(async () => {
    const timestamp = now();
    await db.transaction('rw', db.notas, async () => {
      const avaliacaoIds = [...new Set(records.map(r => r.avaliacao_id))];
      const existingRecords = await db.notas.where('avaliacao_id').anyOf(avaliacaoIds).toArray();
      const existingMap = new Map<string, LocalNota>();
      for (const r of existingRecords) {
        const key = `${r.avaliacao_id}|${r.aluno_id}`;
        existingMap.set(key, r);
      }

      for (const data of records) {
        const key = `${data.avaliacao_id}|${data.aluno_id}`;
        const existing = existingMap.get(key);

        if (existing?.localId) {
          await db.notas.update(existing.localId, {
            ...data,
            syncStatus: 'pending',
            updatedAt: timestamp,
            version: (existing.version || 0) + 1,
          });
        } else {
          await db.notas.add({
            ...data,
            syncStatus: 'pending',
            createdAt: timestamp,
            updatedAt: timestamp,
            version: 1,
          });
        }
      }
    });
  });
}

export async function getNotasLocal(avaliacaoIds: string[]): Promise<LocalNota[]> {
  if (avaliacaoIds.length === 0) return [];
  return db.notas
    .where('avaliacao_id')
    .anyOf(avaliacaoIds)
    .toArray();
}

export async function deleteNotasLocal(avaliacaoId: string, alunoIds: string[]): Promise<void> {
  if (alunoIds.length === 0) return;
  await db.transaction('rw', db.notas, async () => {
    const existing = await db.notas.where('avaliacao_id').equals(avaliacaoId).toArray();
    const toDelete = existing.filter(n => alunoIds.includes(n.aluno_id));
    const ids = toDelete.map(n => n.localId).filter((id): id is number => id !== undefined);
    if (ids.length > 0) {
      await db.notas.bulkDelete(ids);
    }
  });
}

export async function cacheNotas(records: Omit<LocalNota, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  if (records.length === 0) return;
  const timestamp = now();

  // FIX: Buscar todas as notas existentes das avaliações referenciadas de uma vez
  const avaliacaoIds = [...new Set(records.map(r => r.avaliacao_id))];
  const existingRecords = await db.notas.where('avaliacao_id').anyOf(avaliacaoIds).toArray();
  const existingMap = new Map<string, LocalNota>();
  for (const r of existingRecords) {
    const key = `${r.avaliacao_id}|${r.aluno_id}`;
    existingMap.set(key, r);
  }

  await db.transaction('rw', db.notas, async () => {
    for (const data of records) {
      const key = `${data.avaliacao_id}|${data.aluno_id}`;
      const existing = existingMap.get(key);

      if (existing?.localId) {
        if (existing.syncStatus !== 'pending') {
          await db.notas.update(existing.localId, {
            ...data,
            syncStatus: 'synced',
            updatedAt: timestamp,
            version: existing.version || 1,
          });
        }
      } else {
        await db.notas.add({
          ...data,
          syncStatus: 'synced',
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        });
      }
    }
  });
}

// ============================================================
// Horários (cache somente leitura)
// ============================================================

export async function cacheHorarios(
  turmaId: string,
  records: Omit<LocalHorario, 'localId' | 'syncStatus' | 'updatedAt'>[],
  disciplina?: string
): Promise<void> {
  const tid = getTid(turmaId);
  // Limpa horários existentes da turma para a disciplina específica para evitar apagar de outras disciplinas
  const comp = disciplina || (records.length > 0 ? records[0].componente : null);

  await db.transaction('rw', db.horarios, async () => {
    const existing = await db.horarios.where('turma_id').equals(tid).toArray();
    const toDelete = comp 
      ? existing.filter(h => (h.componente || '').trim().toLowerCase() === comp.trim().toLowerCase()) 
      : existing;

    const ids = toDelete.map(h => h.localId).filter((id): id is number => id !== undefined);
    if (ids.length > 0) await db.horarios.bulkDelete(ids);

    const timestamp = now();
    const toAdd = records.map(h => ({
      ...h,
      turma_id: tid,
      syncStatus: 'synced' as SyncStatus,
      updatedAt: timestamp,
    }));
    if (toAdd.length > 0) {
      await db.horarios.bulkAdd(toAdd);
    }
  });
}

export async function getHorariosLocal(turmaId: string): Promise<LocalHorario[]> {
  const tid = getTid(turmaId);
  return db.horarios.where('turma_id').equals(tid).toArray();
}

// ============================================================
// Fechamentos
// ============================================================

export async function saveFechamentoLocal(data: Omit<LocalFechamento, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<number> {
  // FIX #9: Envolver em withQuotaRecovery para recuperação automática quando IndexedDB estiver cheio
  return withQuotaRecovery(async () => {
    const tid = getTid(data.turma_id);
    const normalizedData = { ...data, turma_id: tid };
    const existing = await db.fechamentos
      .where('[turma_id+disciplina+bimestre]')
      .equals([tid, normalizedData.disciplina, normalizedData.bimestre])
      .first();

    const timestamp = now();

    if (existing?.localId) {
      await db.fechamentos.update(existing.localId, {
        ...normalizedData,
        syncStatus: 'pending',
        updatedAt: timestamp,
        version: (existing.version || 0) + 1,
      });
      return existing.localId;
    }

    return await db.fechamentos.add({
      ...normalizedData,
      syncStatus: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      version: 1,
    }) as number;
  });
}

export async function getFechamentosLocal(turmaId: string, disciplina: string): Promise<LocalFechamento[]> {
  const tid = getTid(turmaId);
  return db.fechamentos
    .where('[turma_id+disciplina+bimestre]')
    .between(
      [tid, disciplina, Dexie.minKey],
      [tid, disciplina, Dexie.maxKey]
    )
    .toArray();
}

export async function cacheFechamentos(turmaId: string, disciplina: string, records: Omit<LocalFechamento, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  if (records.length === 0) return;
  const tid = getTid(turmaId);
  const timestamp = now();

  // FIX N+1: Buscar todos os fechamentos da turma+disciplina de uma vez
  // em vez de fazer uma query por bimestre dentro do loop.
  const existingRecords = await db.fechamentos
    .where('[turma_id+disciplina+bimestre]')
    .between(
      [tid, disciplina, Dexie.minKey],
      [tid, disciplina, Dexie.maxKey]
    )
    .toArray();

  const existingMap = new Map<string, LocalFechamento>();
  for (const r of existingRecords) {
    existingMap.set(r.bimestre, r);
  }

  await db.transaction('rw', db.fechamentos, async () => {
    for (const rawData of records) {
      const data = { ...rawData, turma_id: tid };
      const existing = existingMap.get(data.bimestre);

      if (existing?.localId) {
        if (existing.syncStatus !== 'pending') {
          await db.fechamentos.update(existing.localId, {
            ...data,
            syncStatus: 'synced',
            updatedAt: timestamp,
            version: existing.version || 1,
          });
        }
      } else {
        await db.fechamentos.add({
          ...data,
          syncStatus: 'synced',
          createdAt: timestamp,
          updatedAt: timestamp,
          version: 1,
        });
      }
    }
  });
}

// ============================================================
// Usuário cacheado
// ============================================================

export async function cacheUser(user: CachedUser): Promise<void> {
  await db.cachedUsers.put(user);
}

export async function getCachedUser(userId?: string): Promise<CachedUser | undefined> {
  if (userId) {
    return db.cachedUsers.get(userId);
  }
  // FIX A5: Sem userId explícito, retornamos o primeiro usuário do cache.
  // Em dispositivos compartilhados (ex: computador de escola), pode haver múltiplos
  // usuários cacheados. Se isso acontecer, lançamos um aviso para facilitar diagnóstico.
  // A chave de criptografia é derivada do userId do cache — um usuário errado resultaria
  // em falha de descriptografia e re-fetch do servidor (comportamento seguro, mas ruidoso).
  const allCached = await db.cachedUsers.toArray();
  if (allCached.length > 1) {
    console.warn(
      `[offlineStorage] getCachedUser() chamado sem userId em dispositivo com ${allCached.length} usuários em cache. ` +
      `Retornando o primeiro. Para evitar isso, sempre passe o userId explicitamente.`
    );
  }
  return allCached[0];
}

export async function clearCachedUser(): Promise<void> {
  await db.cachedUsers.clear();
}

// ============================================================
// Arquivos (ETAPA 6)
// ============================================================

export async function saveFileLocal(blob: Blob, filename: string, mimeType: string, relatedTable?: string, relatedId?: string): Promise<number> {
  return await db.files.add({
    blob,
    filename,
    mimeType,
    sizeBytes: blob.size,
    relatedTable,
    relatedId,
    syncStatus: 'pending',
    createdAt: now(),
  }) as number;
}

export async function getFileLocal(localId: number): Promise<LocalFile | undefined> {
  return db.files.get(localId);
}

export async function getPendingFiles(): Promise<LocalFile[]> {
  return db.files.where('syncStatus').equals('pending').toArray();
}

// ============================================================
// Utilitários globais
// ============================================================

/** Retorna contagem de registros pendentes de sincronização em todas as tabelas */
export async function getPendingCount(): Promise<number> {
  const [freq, cont, aval, notas, fech] = await Promise.all([
    db.frequencias.where('syncStatus').equals('pending').count(),
    db.conteudos.where('syncStatus').equals('pending').count(),
    db.avaliacoes.where('syncStatus').equals('pending').count(),
    db.notas.where('syncStatus').equals('pending').count(),
    db.fechamentos.where('syncStatus').equals('pending').count(),
  ]);
  return freq + cont + aval + notas + fech;
}

/** Retorna contagem de itens na fila de sync */
export async function getQueueCount(): Promise<number> {
  return db.syncQueue.where('status').anyOf(['pending', 'processing']).count();
}

/** Limpa dados antigos já sincronizados (mais velhos que maxAgeDays) */
export async function clearOldSyncedData(maxAgeDays: number = 60): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffISO = cutoff.toISOString();

  let deletedCount = 0;

  // FIX: Usar índice composto [syncStatus+updatedAt] (schema v4) para range query eficiente
  // em vez de .where('syncStatus').filter(JS) que fazia full scan + filter em memória
  for (const tableName of OPERATIONAL_TABLE_NAMES) {
    const table = getOperationalTable(tableName);
    if (!table) continue;

    try {
      const old = await table
        .where('[syncStatus+updatedAt]')
        .between(['synced', Dexie.minKey], ['synced', cutoffISO]) // FIX #8: Dexie.minKey em vez de '' como lower bound
        .toArray();
      
      const ids = old.map((r: { localId?: number }) => r.localId).filter((id): id is number => id !== undefined);
      if (ids.length > 0) {
        await table.bulkDelete(ids);
        deletedCount += ids.length;
      }
    } catch {
      // Fallback para schema < v4 (sem índice composto)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allRecords = await (table as any).where('syncStatus').equals('synced').toArray() as Array<{ localId?: number; updatedAt: string }>;
      const old = allRecords.filter(r => r.updatedAt < cutoffISO);
      
      const ids = old.map(r => r.localId).filter((id): id is number => id !== undefined);
      if (ids.length > 0) {
        await table.bulkDelete(ids);
        deletedCount += ids.length;
      }
    }
  }

  // Limpa logs antigos
  const oldLogs = await db.syncLogs.where('timestamp').below(cutoffISO).toArray();
  const logIds = oldLogs.map(l => l.id).filter((id): id is number => id !== undefined);
  if (logIds.length > 0) {
    await db.syncLogs.bulkDelete(logIds);
    deletedCount += logIds.length;
  }

  // FIX #6: Limpar dead letter (itens com status 'error') mais antigos que maxAgeDays
  // Sem isso, a tabela syncQueue cresce indefinidamente com itens irrecuperáveis.
  // FIX F8: Apenas itens marcados [DEAD_LETTER] devem ser removidos. Erros
  // RECUPERÁVEIS (rede, dependência) podem ainda ser sincronizados após o
  // backoff — purgá-los causaria perda silenciosa de dados.
  try {
    const oldErrors = await db.syncQueue
      .where('status').equals('error')
      .filter(item => item.updatedAt < cutoffISO && (item.lastError?.includes('[DEAD_LETTER]') === true))
      .toArray();
    const errorIds = oldErrors.map(e => e.id).filter((id): id is number => id !== undefined);
    if (errorIds.length > 0) {
      await db.syncQueue.bulkDelete(errorIds);
      deletedCount += errorIds.length;
      console.log(`[offlineStorage] Limpeza: ${errorIds.length} itens dead letter removidos da fila`);
    }
  } catch (err) {
    console.warn('[offlineStorage] Erro ao limpar dead letter da syncQueue:', err);
  }

  return deletedCount;
}

/** Limpa TODOS os dados locais (para logout) */
export async function clearAllLocalData(clearQueue = false, clearCrypto = false): Promise<void> {
  const promises: Promise<void>[] = [
    db.turmas.clear(),
    db.alunos.clear(),
    db.frequencias.clear(),
    db.conteudos.clear(),
    db.avaliacoes.clear(),
    db.notas.clear(),
    db.horarios.clear(),
    db.fechamentos.clear(),
    db.curriculos.clear(),
    db.syncLogs.clear(),
    db.cachedUsers.clear(),
    db.files.clear(),
  ];
  // FIX #11: userSalts contém chaves CryptoKey não-exportáveis.
  // Apagar no logout impediria descriptografar dados cacheados após re-login.
  // Só apagar em exclusão total de dados (LGPD) ou reset completo.
  if (clearCrypto) {
    promises.push(db.userSalts.clear());
  }
  if (clearQueue) {
    promises.push(db.syncQueue.clear());
  }
  // FIX: Usar allSettled para garantir que todas as tabelas sejam tentadas
  // mesmo se alguma falhar (ex: IndexedDB corrompido parcialmente)
  const results = await Promise.allSettled(promises);
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn(`[offlineStorage] clearAllLocalData: ${failures.length} tabela(s) falharam:`,
      failures.map(f => (f as PromiseRejectedResult).reason));
  }
}

/** Verifica uso de armazenamento */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percentUsed: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    return {
      usage,
      quota,
      percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
    };
  }
  return { usage: 0, quota: 0, percentUsed: 0 };
}

