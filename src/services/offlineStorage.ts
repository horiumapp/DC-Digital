/**
 * offlineStorage.ts — Camada CRUD sobre o IndexedDB (Dexie)
 * 
 * Todas as operações CRUD do app passam por aqui.
 * Escreve localmente com syncStatus='pending' e enfileira para sincronização.
 */
import Dexie from 'dexie';
import { db, now, type SyncStatus } from '../lib/db';
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
} from '../lib/db';

// ============================================================
// Tipos genéricos
// ============================================================

type TableName = 'turmas' | 'alunos' | 'frequencias' | 'conteudos' | 'avaliacoes' | 'notas' | 'horarios' | 'fechamentos';

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
// Alunos (cache somente leitura)
// ============================================================

export async function cacheAlunos(alunos: Omit<LocalAluno, 'syncStatus' | 'updatedAt'>[]): Promise<void> {
  const records = alunos.map(a => ({
    ...a,
    syncStatus: 'synced' as SyncStatus,
    updatedAt: now(),
  }));
  await db.alunos.bulkPut(records);
}

export async function getCachedAlunos(turmaId: string): Promise<LocalAluno[]> {
  return db.alunos.where('turma_id').equals(turmaId).toArray();
}

// ============================================================
// Frequências
// ============================================================

export async function saveFrequenciaLocal(data: Omit<LocalFrequencia, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<number> {
  // Tenta encontrar registro existente pela chave composta
  const existing = await db.frequencias
    .where('[turma_id+aluno_id+data+tempo+disciplina]')
    .equals([data.turma_id, data.aluno_id, data.data, data.tempo, data.disciplina])
    .first();

  const timestamp = now();

  if (existing && existing.localId) {
    await db.frequencias.update(existing.localId, {
      ...data,
      syncStatus: 'pending',
      updatedAt: timestamp,
      version: (existing.version || 0) + 1,
    });
    return existing.localId;
  }

  return await db.frequencias.add({
    ...data,
    syncStatus: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  });
}

export async function saveFrequenciasBulk(
  records: Omit<LocalFrequencia, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]
): Promise<void> {
  const timestamp = now();

  await db.transaction('rw', db.frequencias, async () => {
    for (const data of records) {
      const existing = await db.frequencias
        .where('[turma_id+aluno_id+data+tempo+disciplina]')
        .equals([data.turma_id, data.aluno_id, data.data, data.tempo, data.disciplina])
        .first();

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
}

export async function getFrequenciasLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<LocalFrequencia[]> {
  return db.frequencias
    .where('turma_id').equals(turmaId)
    .filter(f => f.disciplina === disciplina && f.data === data && f.tempo === tempo)
    .toArray();
}

export async function getAllFrequenciasLocal(turmaId: string, disciplina?: string): Promise<LocalFrequencia[]> {
  let query = db.frequencias.where('turma_id').equals(turmaId);
  if (disciplina) {
    return query.filter(f => f.disciplina.toLowerCase() === disciplina.toLowerCase()).toArray();
  }
  return query.toArray();
}

export async function deleteFrequenciasLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<void> {
  const records = await db.frequencias
    .where('[turma_id+aluno_id+data+tempo+disciplina]')
    .between(
      [turmaId, Dexie.minKey, data, tempo, disciplina],
      [turmaId, Dexie.maxKey, data, tempo, disciplina]
    )
    .toArray();

  const ids = records.map(r => r.localId).filter((id): id is number => id !== undefined);
  if (ids.length > 0) {
    await db.frequencias.bulkDelete(ids);
  }
}

/** Cache frequências vindas do servidor (marca como synced) */
export async function cacheFrequencias(turmaId: string, records: Omit<LocalFrequencia, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  const timestamp = now();
  await db.transaction('rw', db.frequencias, async () => {
    for (const data of records) {
      const existing = await db.frequencias
        .where('[turma_id+aluno_id+data+tempo+disciplina]')
        .equals([turmaId, data.aluno_id, data.data, data.tempo, data.disciplina])
        .first();

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
          turma_id: turmaId,
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
  const existing = await db.conteudos
    .where('[turma_id+data+tempo+disciplina]')
    .equals([data.turma_id, data.data, data.tempo, data.disciplina])
    .first();

  const timestamp = now();

  if (existing && existing.localId) {
    await db.conteudos.update(existing.localId, {
      ...data,
      syncStatus: 'pending',
      updatedAt: timestamp,
      version: (existing.version || 0) + 1,
    });
    return existing.localId;
  }

  return await db.conteudos.add({
    ...data,
    syncStatus: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  });
}

export async function getConteudoLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<LocalConteudo | undefined> {
  return db.conteudos
    .where('[turma_id+data+tempo+disciplina]')
    .equals([turmaId, data, tempo, disciplina])
    .first();
}

export async function getAllConteudosLocal(turmaId: string, disciplina?: string): Promise<LocalConteudo[]> {
  let query = db.conteudos.where('turma_id').equals(turmaId);
  if (disciplina) {
    return query.filter(c => c.disciplina.toLowerCase() === disciplina.toLowerCase()).toArray();
  }
  return query.toArray();
}

export async function deleteConteudoLocal(turmaId: string, disciplina: string, data: string, tempo: string): Promise<void> {
  const record = await db.conteudos
    .where('[turma_id+data+tempo+disciplina]')
    .equals([turmaId, data, tempo, disciplina])
    .first();
  if (record?.localId) {
    await db.conteudos.delete(record.localId);
  }
}

export async function cacheConteudos(turmaId: string, records: Omit<LocalConteudo, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  const timestamp = now();
  await db.transaction('rw', db.conteudos, async () => {
    for (const data of records) {
      const existing = await db.conteudos
        .where('[turma_id+data+tempo+disciplina]')
        .equals([turmaId, data.data, data.tempo, data.disciplina])
        .first();

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
          turma_id: turmaId,
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
  const timestamp = now();

  // Se tem server ID, atualizar registro existente
  if (data.id) {
    const existing = await db.avaliacoes.where('id').equals(data.id).first();
    if (existing?.localId) {
      await db.avaliacoes.update(existing.localId, {
        ...data,
        syncStatus: 'pending',
        updatedAt: timestamp,
        version: (existing.version || 0) + 1,
      });
      return existing.localId;
    }
  }

  return await db.avaliacoes.add({
    ...data,
    syncStatus: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  });
}

export async function getAvaliacoesLocal(turmaId: string, disciplina?: string): Promise<LocalAvaliacao[]> {
  let query = db.avaliacoes.where('turma_id').equals(turmaId);
  if (disciplina) {
    return query.filter(a => a.disciplina.toLowerCase() === disciplina.toLowerCase()).toArray();
  }
  return query.toArray();
}

export async function deleteAvaliacaoLocal(id: string): Promise<void> {
  const record = await db.avaliacoes.where('id').equals(id).first();
  if (record?.localId) {
    await db.avaliacoes.delete(record.localId);
  }
}

export async function cacheAvaliacoes(records: Array<Omit<LocalAvaliacao, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'> & { id: string }>): Promise<void> {
  const timestamp = now();
  await db.transaction('rw', db.avaliacoes, async () => {
    for (const data of records) {
      const existing = await db.avaliacoes.where('id').equals(data.id).first();
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
  const timestamp = now();
  await db.transaction('rw', db.notas, async () => {
    for (const data of records) {
      const existing = await db.notas
        .where('[avaliacao_id+aluno_id]')
        .equals([data.avaliacao_id, data.aluno_id])
        .first();

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
}

export async function getNotasLocal(avaliacaoIds: string[]): Promise<LocalNota[]> {
  if (avaliacaoIds.length === 0) return [];
  return db.notas
    .filter(n => avaliacaoIds.includes(n.avaliacao_id))
    .toArray();
}

export async function cacheNotas(records: Omit<LocalNota, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  const timestamp = now();
  await db.transaction('rw', db.notas, async () => {
    for (const data of records) {
      const existing = await db.notas
        .where('[avaliacao_id+aluno_id]')
        .equals([data.avaliacao_id, data.aluno_id])
        .first();

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

export async function cacheHorarios(turmaId: string, records: Omit<LocalHorario, 'localId' | 'syncStatus' | 'updatedAt'>[]): Promise<void> {
  // Limpa horários existentes da turma e recria
  const existing = await db.horarios.where('turma_id').equals(turmaId).toArray();
  const ids = existing.map(h => h.localId).filter((id): id is number => id !== undefined);
  if (ids.length > 0) await db.horarios.bulkDelete(ids);

  const timestamp = now();
  const toAdd = records.map(h => ({
    ...h,
    turma_id: turmaId,
    syncStatus: 'synced' as SyncStatus,
    updatedAt: timestamp,
  }));
  await db.horarios.bulkAdd(toAdd);
}

export async function getHorariosLocal(turmaId: string): Promise<LocalHorario[]> {
  return db.horarios.where('turma_id').equals(turmaId).toArray();
}

// ============================================================
// Fechamentos
// ============================================================

export async function saveFechamentoLocal(data: Omit<LocalFechamento, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>): Promise<number> {
  const existing = await db.fechamentos
    .where('[turma_id+disciplina+bimestre]')
    .equals([data.turma_id, data.disciplina, data.bimestre])
    .first();

  const timestamp = now();

  if (existing?.localId) {
    await db.fechamentos.update(existing.localId, {
      ...data,
      syncStatus: 'pending',
      updatedAt: timestamp,
      version: (existing.version || 0) + 1,
    });
    return existing.localId;
  }

  return await db.fechamentos.add({
    ...data,
    syncStatus: 'pending',
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1,
  });
}

export async function getFechamentosLocal(turmaId: string, disciplina: string): Promise<LocalFechamento[]> {
  return db.fechamentos
    .where('[turma_id+disciplina+bimestre]')
    .between(
      [turmaId, disciplina, Dexie.minKey],
      [turmaId, disciplina, Dexie.maxKey]
    )
    .toArray();
}

export async function cacheFechamentos(turmaId: string, disciplina: string, records: Omit<LocalFechamento, 'localId' | 'syncStatus' | 'createdAt' | 'updatedAt' | 'version'>[]): Promise<void> {
  const timestamp = now();
  await db.transaction('rw', db.fechamentos, async () => {
    for (const data of records) {
      const existing = await db.fechamentos
        .where('[turma_id+disciplina+bimestre]')
        .equals([turmaId, disciplina, data.bimestre])
        .first();

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

export async function getCachedUser(): Promise<CachedUser | undefined> {
  return db.cachedUsers.toCollection().first();
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
  });
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

  const tables = [db.frequencias, db.conteudos, db.avaliacoes, db.notas, db.fechamentos] as const;

  for (const table of tables) {
    const old = await (table as typeof db.frequencias)
      .where('syncStatus').equals('synced')
      .filter(r => r.updatedAt < cutoffISO)
      .toArray();
    
    const ids = old.map(r => r.localId).filter((id): id is number => id !== undefined);
    if (ids.length > 0) {
      await (table as typeof db.frequencias).bulkDelete(ids);
      deletedCount += ids.length;
    }
  }

  // Limpa logs antigos
  const oldLogs = await db.syncLogs.where('timestamp').below(cutoffISO).toArray();
  const logIds = oldLogs.map(l => l.id).filter((id): id is number => id !== undefined);
  if (logIds.length > 0) {
    await db.syncLogs.bulkDelete(logIds);
    deletedCount += logIds.length;
  }

  return deletedCount;
}

/** Limpa TODOS os dados locais (para logout) */
export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    db.turmas.clear(),
    db.alunos.clear(),
    db.frequencias.clear(),
    db.conteudos.clear(),
    db.avaliacoes.clear(),
    db.notas.clear(),
    db.horarios.clear(),
    db.fechamentos.clear(),
    db.syncLogs.clear(),
    db.cachedUsers.clear(),
    db.files.clear(),
    // NÃO limpa syncQueue — precisa sincronizar antes
  ]);
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


