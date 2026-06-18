/**
 * offlineQueue.ts — Fila de sincronização persistente no IndexedDB
 * 
 * Gerencia a fila de operações pendentes para envio ao servidor.
 * Implementa deduplicação, retry e controle de prioridade FIFO.
 */
import { db, now, hashOperation, type QueueOperation, type QueueStatus, type SyncQueueItem } from '../lib/db';

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
  const hash = await hashOperation(table, operation, payload);
  const timestamp = now();

  // Deduplicação: substituir se já existe com mesmo hash e status pending (evita mexer em itens 'processing')
  const existing = await db.syncQueue
    .where('hash').equals(hash)
    .filter(item => item.status === 'pending')
    .first();

  if (existing?.id) {
    await db.syncQueue.update(existing.id, {
      payload: JSON.stringify(payload),
      updatedAt: timestamp,
      localId,
    });
    return existing.id;
  }

  // FIX #10: Verificar limite máximo da fila antes de adicionar
  const currentCount = await db.syncQueue.where('status').anyOf(['pending', 'processing']).count();
  if (currentCount >= MAX_QUEUE_SIZE) {
    throw new Error(
      `Limite de operações pendentes atingido (${MAX_QUEUE_SIZE}). ` +
      `Conecte-se à internet para sincronizar antes de fazer mais alterações.`
    );
  }

  if (existing?.id) {
    await db.syncQueue.update(existing.id, {
      payload: JSON.stringify(payload),
      updatedAt: timestamp,
      localId,
    });
    return existing.id;
  }

  return await db.syncQueue.add({
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
    .filter(item => !item.retryAfter || item.retryAfter <= nowISO)
    .first();
}

/**
 * Retorna todos os itens pendentes ordenados por criação.
 */
export async function getAllPending(): Promise<SyncQueueItem[]> {
  return db.syncQueue
    .where('status').equals('pending')
    .sortBy('createdAt');
}

/**
 * Retorna todos os itens na fila (qualquer status).
 */
export async function getAll(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('createdAt').toArray();
}

/**
 * Retorna contagem de itens pendentes.
 */
export async function getPendingCount(): Promise<number> {
  return db.syncQueue.where('status').anyOf(['pending', 'processing']).count();
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
 * Reseta itens com erro para reprocessamento.
 */
export async function retryAllErrors(): Promise<number> {
  const errors = await db.syncQueue.where('status').equals('error').toArray();
  const timestamp = now();
  let count = 0;

  for (const item of errors) {
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
  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
  const stuck = await db.syncQueue
    .where('status').equals('processing')
    .filter(item => item.updatedAt < sixtySecondsAgo)
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
  await db.syncQueue.clear();
}

/**
 * Retorna contagem por status.
 */
export async function getQueueStats(): Promise<Record<QueueStatus, number>> {
  const [pending, processing, done, error] = await Promise.all([
    db.syncQueue.where('status').equals('pending').count(),
    db.syncQueue.where('status').equals('processing').count(),
    db.syncQueue.where('status').equals('done').count(),
    db.syncQueue.where('status').equals('error').count(),
  ]);

  return {
    pending,
    processing,
    done,
    error,
  };
}
