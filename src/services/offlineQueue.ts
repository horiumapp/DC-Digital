/**
 * offlineQueue.ts — Fila de sincronização persistente no IndexedDB
 * 
 * Gerencia a fila de operações pendentes para envio ao servidor.
 * Implementa deduplicação, retry e controle de prioridade FIFO.
 */
import { offlineOwner } from './offlineIdentity';
import { snapshotMutation, keepTransactionAlive, matchesMutation, type MutationRecord } from './syncProtocol';
import { db, getOperationalTable, now, hashOperation, type QueueOperation, type QueueStatus, type SyncQueueItem } from '../lib/db';

const MAX_RETRIES = 5;

// FIX #10: Limite máximo de itens na fila para evitar crescimento ilimitado
const MAX_QUEUE_SIZE = 5000;

// ============================================================
// Operações da fila
// ============================================================

/**
 * Adiciona operação à fila de sincronização.
 * Se uma operação idêntica já existe (mesmo hash), substitui o payload.
 */
export async function enqueue(
  table: string,
  operation: QueueOperation,
  payload: Record<string, unknown>,
  localId?: number
): Promise<number> {
  // FIX C3: Passar localId como discriminador em INSERTs sem identidade no payload
  // (ex: avaliação criada offline) para evitar colisão de hash na fila.
  const ownerUserId = offlineOwner();
  if (!ownerUserId) throw new Error('Sessão offline indisponível. Entre novamente antes de salvar.');
  const hash = await keepTransactionAlive(hashOperation(table, operation, payload, operation === 'INSERT' ? localId : undefined));
  const timestamp = now();

  // Deduplicação, check de limite e inserção em uma única transação Dexie atômica
  // evitando race condition entre chamadas concorrentes.
  return await db.transaction('rw', [db.syncQueue, ...[getOperationalTable(table)].filter(t => t !== undefined)], async () => {
    payload = await snapshotMutation(table, operation, payload, localId);
    const existing = await db.syncQueue
      .where('hash').equals(hash)
      .filter(item => item.status === 'pending' && !item.attempted && item.ownerUserId === ownerUserId)
      .first();

    const later = existing?.id && await db.syncQueue.where('table').equals(table)
      .filter(i => i.ownerUserId === ownerUserId && i.id! > existing.id!).count();
    if (existing?.id && !later) {
      await db.syncQueue.update(existing.id, {
        payload: JSON.stringify(payload),
        updatedAt: timestamp,
        localId,
      });
      return existing.id;
    }

    const currentCount = await db.syncQueue.where('status').anyOf(['pending', 'processing']).filter(i => i.ownerUserId === offlineOwner()).count();
    if (currentCount >= MAX_QUEUE_SIZE) {
      throw new Error(
        `Limite de operações pendentes atingido (${MAX_QUEUE_SIZE}). ` +
        `Conecte-se à internet para sincronizar antes de fazer mais alterações.`
      );
    }

    return await db.syncQueue.add({
      ownerUserId,
      operationId: crypto.randomUUID(),
      table,
      operation,
      payload: JSON.stringify(payload),
      status: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp,
      retryCount: 0,
      hash,
      localId,
    }) as number;
  });
}

/**
 * Remove operação processada com sucesso da fila.
 */
export async function dequeue(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

/**
 * Retorna o próximo item pendente na fila (FIFO).
 */
export async function peek(): Promise<SyncQueueItem | undefined> {
  const nowISO = new Date().toISOString();
  return db.syncQueue
    .where('status').equals('pending')
    .filter(item => item.ownerUserId === offlineOwner() && (!item.retryAfter || item.retryAfter <= nowISO))
    .first();
}

/**
 * Retorna todos os itens pendentes ordenados por criação.
 */
export async function getAllPending(): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .where('status').equals('pending')
    .filter(i => i.ownerUserId === offlineOwner()).sortBy('createdAt');
}

/**
 * Retorna todos os itens na fila (qualquer status).
 */
export async function getAll(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('createdAt').filter(i => i.ownerUserId === offlineOwner()).toArray();
}

/**
 * Retorna contagem de itens pendentes.
 */
export async function getPendingCount(): Promise<number> {
  return db.syncQueue.where('status').anyOf(['pending', 'processing']).filter(i => i.ownerUserId === offlineOwner()).count();
}

/**
 * Marca item como "em processamento".
 */
export async function markProcessing(id: number): Promise<void> {
  await db.syncQueue.update(id, {
    status: 'processing',
    updatedAt: now(),
  });
}

/**
 * Marca item como concluído e remove da fila.
 */
export async function markDone(id: number): Promise<void> {
  await db.syncQueue.delete(id);
}

/**
 * Incrementa contagem de retries. Se excede MAX_RETRIES, marca como erro.
 */
export async function retry(id: number, error: string): Promise<boolean> {
  const item = await db.syncQueue.get(id);
  if (!item) return false;

  const newCount = (item.retryCount || 0) + 1;
  const MIN_BACKOFF_MS = 1000;
  const MAX_BACKOFF_MS = 30000;
  const backoffMs = Math.min(MIN_BACKOFF_MS * Math.pow(2, newCount), MAX_BACKOFF_MS);
  const retryAfter = new Date(Date.now() + backoffMs).toISOString();

  if (newCount >= MAX_RETRIES) {
    await db.syncQueue.update(id, {
      status: 'error' as QueueStatus,
      retryCount: newCount,
      lastError: error,
      updatedAt: now(),
    });
    return false; // Não vai mais tentar
  }

  await db.syncQueue.update(id, {
    status: 'pending' as QueueStatus,
    retryCount: newCount,
    lastError: error,
    updatedAt: now(),
    retryAfter,
  });
  return true; // Vai tentar novamente
}

/**
 * Marca item como erro permanente.
 */
export async function fail(id: number, error: string): Promise<void> {
  await db.syncQueue.update(id, {
    status: 'error' as QueueStatus,
    lastError: error,
    updatedAt: now(),
  });
}

/**
 * Reseta itens com erro RECUPERÁVEL para reprocessamento.
 * Itens marcados [DEAD_LETTER] (RLS, FK, duplicate key) são permanentemente
 * irrecuperáveis e NÃO são incluídos — evita loop infinito de falhas.
 *
 * FIX H5c: `resetBackoff` controla o comportamento de retryCount:
 *  - false (ciclo automático): preserva retryCount e o backoff exponencial,
 *    e NÃO revive itens que já esgotaram MAX_RETRIES (aguardam ação manual).
 *    Antes, zerar retryCount a cada ciclo anulava o backoff e fazia itens
 *    permanentemente falhos rodarem em loop infinito.
 *  - true (ação explícita do usuário "reprocessar"): zera o backoff e tenta
 *    todos os itens não-dead-letter novamente.
 */
export async function retryAllErrors(resetBackoff: boolean = false): Promise<number> {
  const errors = await db.syncQueue.where('status').equals('error').filter(i => i.ownerUserId === offlineOwner()).toArray();
  const timestamp = now();
  let count = 0;

  for (const item of errors) {
    // Não reprocessar itens de dead letter — nunca vão sincronizar
    if (item.lastError?.includes('[DEAD_LETTER]') || item.lastError?.includes('[QUARANTINE]') || item.lastError?.includes('CONFLICT')) continue;

    // Não reviver itens que já esgotaram o limite de retries em ciclo automático
    if (!resetBackoff && (item.retryCount || 0) >= MAX_RETRIES) continue;

    if (item.id) {
      await db.syncQueue.update(item.id, {
        status: 'pending' as QueueStatus,
        retryCount: resetBackoff ? 0 : (item.retryCount || 0),
        lastError: undefined,
        updatedAt: timestamp,
        retryAfter: undefined,
      });
      count++;
    }
  }

  return count;
}

/**
 * Retorna todos os itens permanentemente falhos (dead letter).
 * Útil para exibir ao usuário na tela de diagnóstico/pendências.
 */
export async function getDeadLetterItems(): Promise<SyncQueueItem[]> {
  const errors = await db.syncQueue.where('status').equals('error').filter(i => i.ownerUserId === offlineOwner()).toArray();
  return errors.filter(item => item.lastError?.includes('[DEAD_LETTER]') || item.lastError?.includes('CONFLICT'));
}

/**
 * Descarta itens dead letter permanentemente (ação do usuário ou admin).
 * Retorna a quantidade de itens removidos.
 */
export async function discardDeadLetterItems(): Promise<number> {
  return db.transaction('rw', [db.syncQueue, db.avaliacoes, db.notas, db.frequencias, db.conteudos, db.fechamentos], async () => {
    const deadItems = await getDeadLetterItems();
    for (const item of deadItems) {
      const table = getOperationalTable(item.table);
      const body = JSON.parse(item.payload) as MutationRecord;
      const records = (Array.isArray(body.records) ? body.records : [body]) as MutationRecord[];
      const later = await db.syncQueue.where('table').equals(item.table)
        .filter(i => i.ownerUserId === offlineOwner() && i.id! > item.id!).toArray();
      if (table) {
        const locals = await table.toArray();
        for (const local of locals) {
          const newerEdit = later.some(queued => {
            const next = JSON.parse(queued.payload) as MutationRecord;
            const changes = (Array.isArray(next.records) ? next.records : [next]) as MutationRecord[];
            return changes.some(r => matchesMutation(item.table,local as unknown as MutationRecord,r));
          });
          if (!newerEdit && local.localId !== undefined && (local.localId === item.localId || records.some(r => matchesMutation(item.table,local as unknown as MutationRecord,r)))) {
            await table.delete(local.localId);
          }
        }
      }
      await db.syncQueue.delete(item.id!);
    }
    return deadItems.length;
  });
}

/**
 * Força a re-tentativa de itens marcados como dead letter (ação explícita do usuário).
 * Reseta o status para 'pending', zerando o retryCount e o erro.
 * Retorna a quantidade de itens re-enfileirados.
 */
export async function retryDeadLetterItems(): Promise<number> {
  const deadItems = await getDeadLetterItems();
  const timestamp = now();
  let count = 0;

  for (const item of deadItems) {
    if (item.lastError?.includes('CONFLICT')) continue;
    if (item.id) {
      await db.syncQueue.update(item.id, {
        status: 'pending' as QueueStatus,
        retryCount: 0,
        lastError: undefined,
        updatedAt: timestamp,
        retryAfter: undefined,
      });
      count++;
    }
  }

  return count;
}

/**
 * Reseta itens em 'processing' travados (mais de 60s) para 'pending'.
 * Útil para recovery após crash/reload.
 */
export async function resetStuckItems(): Promise<number> {
  const twoMinutesAgo = new Date(Date.now() - 120_000).toISOString();
  const stuck = await db.syncQueue
    .where('status').equals('processing')
    .filter(item => item.ownerUserId === offlineOwner() && item.updatedAt < twoMinutesAgo)
    .toArray();

  const timestamp = now();
  let count = 0;

  for (const item of stuck) {
    if (item.id) {
      await db.syncQueue.update(item.id, {
        status: 'pending' as QueueStatus,
        updatedAt: timestamp,
        retryAfter: undefined,
      });
      count++;
    }
  }

  return count;
}

/**
 * Limpa toda a fila.
 */
export async function clearQueue(): Promise<void> {
  await db.syncQueue.filter(i => i.ownerUserId === offlineOwner()).delete();
}

/**
 * Retorna contagem por status.
 * Nota: 'done' não é incluído pois markDone() deleta o item imediatamente.
 */
export async function getQueueStats(): Promise<Record<Exclude<QueueStatus, 'done'>, number>> {
  const [pending, processing, error] = await Promise.all([
    db.syncQueue.where('status').equals('pending').filter(i => i.ownerUserId === offlineOwner()).count(),
    db.syncQueue.where('status').equals('processing').filter(i => i.ownerUserId === offlineOwner()).count(),
    db.syncQueue.where('status').equals('error').filter(i => i.ownerUserId === offlineOwner()).count(),
  ]);

  return {
    pending,
    processing,
    // FIX B2: 'done' removido — markDone() deleta o item (não muda status).
    // A contagem era sempre 0, gerando confusão no código de diagnóstico.
    error,
  };
}

/** Atomically reserve the exact payload being dispatched. */
export async function claimNext(ownerUserId: string): Promise<SyncQueueItem | undefined> {
  return db.transaction('rw', db.syncQueue, async () => {
    const timestamp = now();
    const queued = await db.syncQueue.orderBy('id').filter(i => i.ownerUserId === ownerUserId).toArray();
    
    // Tabelas que já possuem item sendo ativamente processado não devem ter outro item concorrente
    const activeProcessingTables = new Set(
      queued.filter(i => i.status === 'processing').map(i => i.table)
    );

    const seenPendingTables = new Set<string>();

    const item = queued.find(i => {
      // Se a tabela já está sendo processada, aguardar para manter serialização
      if (activeProcessingTables.has(i.table)) return false;

      // Não reivindicar itens que já falharam definitivamente ou não estão pendentes
      if (i.status !== 'pending') return false;

      // Apenas um item pendente por tabela por rodada de claim
      if (seenPendingTables.has(i.table)) return false;
      seenPendingTables.add(i.table);

      // Respeitar backoff de retry
      return !i.retryAfter || i.retryAfter <= timestamp;
    });

    if (!item?.id) return undefined;
    await db.syncQueue.update(item.id, {status:'processing', updatedAt:timestamp});
    return {...item,status:'processing'};
  });
}
