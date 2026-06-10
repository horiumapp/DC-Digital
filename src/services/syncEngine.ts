/**
 * syncEngine.ts — Motor de sincronização offline-first
 * 
 * Processa a fila de operações pendentes, enviando para o Supabase.
 * Implementa retry com backoff exponencial, deduplicação, e resolução
 * de conflitos via last-write-wins.
 */
import { supabase } from '../lib/supabase';
import { db, now, type SyncLogEntry, type SyncQueueItem } from '../lib/db';
import * as Queue from './offlineQueue';

// ============================================================
// Tipos
// ============================================================

export type SyncState = 'IDLE' | 'SYNCING' | 'ERROR';

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

type SyncEventType = 'start' | 'complete' | 'error' | 'itemSynced' | 'itemFailed' | 'stateChange';
type SyncListener = (event: SyncEventType, data?: unknown) => void;

// ============================================================
// Estado e Controle
// ============================================================

let _state: SyncState = 'IDLE';
let _isSyncing = false;
let _debounceTimer: ReturnType<typeof setTimeout> | null = null;
const _listeners: Set<SyncListener> = new Set();

const DEBOUNCE_MS = 2000;

function setState(newState: SyncState) {
  if (_state !== newState) {
    _state = newState;
    emit('stateChange', newState);
  }
}

function emit(event: SyncEventType, data?: unknown) {
  _listeners.forEach(fn => {
    try { fn(event, data); } catch (e) { console.error('[SyncEngine] Listener error:', e); }
  });
}

// ============================================================
// API Pública
// ============================================================

/** Retorna o estado atual do engine */
export function getState(): SyncState {
  return _state;
}

/** Registra um listener para eventos de sync */
export function subscribe(listener: SyncListener): () => void {
  _listeners.add(listener);
  return () => { _listeners.delete(listener); };
}

/** Agenda sincronização com debounce (evita múltiplas chamadas simultâneas) */
export function scheduleSync(): void {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    syncAll();
  }, DEBOUNCE_MS);
}

/** Sincroniza toda a fila de operações pendentes */
export async function syncAll(): Promise<SyncResult> {
  if (_isSyncing) {
    return { synced: 0, failed: 0, errors: ['Sincronização já em andamento'] };
  }

  // Verificar se realmente está online
  if (!navigator.onLine) {
    return { synced: 0, failed: 0, errors: ['Sem conexão com a internet'] };
  }

  _isSyncing = true;
  setState('SYNCING');
  emit('start');

  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  try {
    // Resetar itens travados de sessão anterior
    await Queue.resetStuckItems();

    // Processar fila em ordem FIFO
    let item = await Queue.peek();

    while (item?.id) {
      try {
        await Queue.markProcessing(item.id);
        await processItem(item);
        await Queue.markDone(item.id);
        
        // Atualizar syncStatus do registro local
        await markLocalRecordSynced(item);

        await logSync(item.table, item.operation, 'success');
        result.synced++;
        emit('itemSynced', { table: item.table, operation: item.operation });

      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await Queue.retry(item.id, errorMsg);
        
        await logSync(item.table, item.operation, 'error', errorMsg);
        result.failed++;
        result.errors.push(`${item.table}/${item.operation}: ${errorMsg}`);
        emit('itemFailed', { table: item.table, error: errorMsg });

        // Se ficou offline durante o sync, parar
        if (!navigator.onLine) {
          result.errors.push('Conexão perdida durante sincronização');
          break;
        }
      }

      // Próximo item
      item = await Queue.peek();
    }

    setState(result.failed > 0 ? 'ERROR' : 'IDLE');
    emit('complete', result);

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Erro geral: ${errorMsg}`);
    setState('ERROR');
    emit('error', errorMsg);
  } finally {
    _isSyncing = false;
  }

  return result;
}

// ============================================================
// Sanitização e Validação de Payloads (Segurança / Integridade)
// ============================================================

function sanitizeFrequencia(payload: any): Record<string, unknown> {
  return {
    turma_id: String(payload.turma_id),
    aluno_id: String(payload.aluno_id),
    data: String(payload.data),
    tempo: String(payload.tempo),
    status: String(payload.status || 'P'),
    participacao: String(payload.participacao || 'Presencial'),
    disciplina: String(payload.disciplina),
  };
}

function sanitizeConteudo(payload: any): Record<string, unknown> {
  return {
    turma_id: String(payload.turma_id),
    data: String(payload.data),
    tempo: String(payload.tempo),
    objetos: Array.isArray(payload.objetos) ? payload.objetos.map(String) : [],
    habilidades: Array.isArray(payload.habilidades) ? payload.habilidades.map(String) : [],
    descricao: String(payload.descricao || ''),
    disciplina: String(payload.disciplina),
  };
}

function sanitizeAvaliacao(payload: any): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    turma_id: String(payload.turma_id),
    tipo: String(payload.tipo),
    data: String(payload.data),
    instrumento: String(payload.instrumento || ''),
    objetos: Array.isArray(payload.objetos)
      ? payload.objetos.map((obj: any) => ({
          objeto: String(obj?.objeto || ''),
          unidade: String(obj?.unidade || ''),
        }))
      : [],
    bimestre: String(payload.bimestre),
    valor_maximo: Number(payload.valor_maximo || 10),
    disciplina: String(payload.disciplina),
  };

  if (payload.id && !String(payload.id).startsWith('temp_')) {
    sanitized.id = String(payload.id);
  }
  if (payload.parent_id) {
    sanitized.parent_id = String(payload.parent_id);
  }

  return sanitized;
}

function sanitizeNota(payload: any): Record<string, unknown> {
  return {
    avaliacao_id: String(payload.avaliacao_id),
    aluno_id: String(payload.aluno_id),
    valor: Number(payload.valor),
  };
}

function sanitizeFechamento(payload: any): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    turma_id: String(payload.turma_id),
    disciplina: String(payload.disciplina),
    bimestre: String(payload.bimestre),
    status: String(payload.status || 'FECHADO'),
  };
  if (payload.usuario_fechamento_id) {
    sanitized.usuario_fechamento_id = String(payload.usuario_fechamento_id);
  }
  return sanitized;
}

// ============================================================
// Processamento de itens individuais
// ============================================================

async function processItem(item: SyncQueueItem): Promise<void> {
  if (!item) throw new Error('Item nulo');

  const payload = JSON.parse(item.payload);

  switch (item.table) {
    case 'frequencias':
      await syncFrequencia(item.operation, payload);
      break;
    case 'conteudos':
      await syncConteudo(item.operation, payload);
      break;
    case 'avaliacoes':
      await syncAvaliacao(item.operation, payload);
      break;
    case 'notas':
      await syncNotas(item.operation, payload);
      break;
    case 'fechamentos':
      await syncFechamento(item.operation, payload);
      break;
    default:
      throw new Error(`Tabela desconhecida: ${item.table}`);
  }
}

// ============================================================
// Sync por tabela (envia para Supabase)
// ============================================================

async function syncFrequencia(operation: string, payload: Record<string, unknown>): Promise<void> {
  if (operation === 'DELETE') {
    const { error } = await supabase
      .from('frequencias')
      .delete()
      .eq('turma_id', payload.turma_id)
      .eq('data', payload.data)
      .eq('tempo', payload.tempo)
      .eq('disciplina', payload.disciplina);
    if (error) throw error;
    return;
  }

  // UPSERT — Suporta tanto lote (batch) quanto registro individual legado
  const records = Array.isArray(payload.records) ? payload.records : [payload];
  const sanitizedRecords = records.map(sanitizeFrequencia);

  const { error } = await supabase
    .from('frequencias')
    .upsert(sanitizedRecords, { onConflict: 'turma_id,aluno_id,data,tempo,disciplina' });
  if (error) throw error;
}

async function syncConteudo(operation: string, payload: Record<string, unknown>): Promise<void> {
  const sanitized = sanitizeConteudo(payload);
  if (operation === 'DELETE') {
    const { error } = await supabase
      .from('conteudos')
      .delete()
      .eq('turma_id', sanitized.turma_id)
      .eq('data', sanitized.data)
      .eq('tempo', sanitized.tempo)
      .eq('disciplina', sanitized.disciplina);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('conteudos')
    .upsert(sanitized, { onConflict: 'turma_id,data,tempo,disciplina' });
  if (error) throw error;
}

async function syncAvaliacao(operation: string, payload: Record<string, unknown>): Promise<void> {
  if (operation === 'DELETE') {
    const { error } = await supabase.from('avaliacoes').delete().eq('id', payload.id);
    if (error) throw error;
    return;
  }

  const sanitized = sanitizeAvaliacao(payload);

  // Se tem ID do server, é update
  if (sanitized.id) {
    const { error } = await supabase
      .from('avaliacoes')
      .update(sanitized)
      .eq('id', sanitized.id);
    if (error) throw error;
  } else {
    // Insert
    const { error } = await supabase
      .from('avaliacoes')
      .insert([sanitized]);
    if (error) throw error;
  }
}

async function syncNotas(operation: string, payload: Record<string, unknown>): Promise<void> {
  // Notas sempre são upsert em batch ou individual
  const records = Array.isArray(payload.records) ? payload.records : [payload];
  const sanitizedRecords = records.map(sanitizeNota);
  const { error } = await supabase
    .from('notas')
    .upsert(sanitizedRecords, { onConflict: 'avaliacao_id,aluno_id' });
  if (error) throw error;
}

async function syncFechamento(operation: string, payload: Record<string, unknown>): Promise<void> {
  const sanitized = sanitizeFechamento(payload);
  if (operation === 'DELETE' || sanitized.status === 'ABERTO') {
    const { error } = await supabase
      .from('fechamentos_bimestres')
      .delete()
      .eq('turma_id', sanitized.turma_id)
      .eq('disciplina', sanitized.disciplina)
      .eq('bimestre', sanitized.bimestre);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('fechamentos_bimestres')
    .upsert(sanitized, { onConflict: 'turma_id,disciplina,bimestre' });
  if (error) throw error;
}

// ============================================================
// Helpers
// ============================================================

/** Atualiza o syncStatus do registro local para 'synced' */
async function markLocalRecordSynced(item: { table: string; localId?: number }): Promise<void> {
  if (!item.localId) return;
  
  const timestamp = now();
  const table = (db as unknown as Record<string, { update: (id: number, data: Record<string, unknown>) => Promise<unknown> }>)[item.table];
  
  if (table?.update) {
    try {
      await table.update(item.localId, {
        syncStatus: 'synced',
        updatedAt: timestamp,
      });
    } catch (err) {
      console.warn(`[SyncEngine] Falha ao marcar registro local ${item.table}/${item.localId} como sincronizado:`, err);
    }
  }
}

/** Registra log de sincronização */
async function logSync(table: string, operation: string, status: 'success' | 'error' | 'conflict', details?: string): Promise<void> {
  try {
    const entry: SyncLogEntry = {
      timestamp: now(),
      table,
      operation: operation as SyncLogEntry['operation'],
      status,
      details,
    };
    await db.syncLogs.add(entry);
  } catch (err) {
    console.warn(`[SyncEngine] Falha ao registrar log de sincronização para ${table}/${operation}:`, err);
  }
}

/** Retorna logs recentes de sincronização */
export async function getRecentLogs(limit: number = 50): Promise<SyncLogEntry[]> {
  return db.syncLogs
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

/** Verifica se há itens pendentes na fila */
export async function hasPendingItems(): Promise<boolean> {
  const count = await Queue.getPendingCount();
  return count > 0;
}

/** Retorna estatísticas da fila */
export async function getQueueStats() {
  return Queue.getQueueStats();
}

/** Tenta reprocessar itens com erro */
export async function retryErrors(): Promise<number> {
  const count = await Queue.retryAllErrors();
  if (count > 0) {
    scheduleSync();
  }
  return count;
}
