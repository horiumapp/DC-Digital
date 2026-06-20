/**
 * syncEngine.ts — Motor de sincronização offline-first
 * 
 * Processa a fila de operações pendentes, enviando para o Supabase.
 * Implementa retry com backoff exponencial, deduplicação, e resolução
 * de conflitos via last-write-wins.
 */
import { supabase } from '../lib/supabase';
import { db, now, hashOperation, getOperationalTable, type SyncLogEntry, type SyncQueueItem } from '../lib/db';
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
        const serverId = await processItem(item);
        await Queue.markDone(item.id);
        
        // Se processItem retornou um novo ID (no caso de inserção de avaliação com ID temporário)
        if (item.table === 'avaliacoes' && serverId && item.localId) {
          await updateTempAvaliacaoId(item.localId, serverId);
        } else {
          // Atualizar syncStatus do registro local
          await markLocalRecordSynced(item);
        }

        await logSync(item.table, item.operation, 'success');
        result.synced++;
        emit('itemSynced', { table: item.table, operation: item.operation });

      } catch (err) {
        const rawErrorMsg = err instanceof Error ? err.message : String(err);
        // LGPD: Sanitizar PII antes de persistir no log
        const errorMsg = sanitizePII(rawErrorMsg);
        
        // FIX #8: Diferenciar erros recuperáveis de não-recuperáveis.
        // Erros fatais (RLS, duplicate, FK) são movidos para dead letter
        // em vez de bloquear toda a fila.
        if (isNonRecoverableError(errorMsg)) {
          await Queue.fail(item.id, `[DEAD_LETTER] ${errorMsg}`);
          await logSync(item.table, item.operation, 'error', `[DEAD_LETTER] ${errorMsg}`);
          result.failed++;
          result.errors.push(`${item.table}/${item.operation}: [DEAD_LETTER] ${errorMsg}`);
          emit('itemFailed', { table: item.table, error: errorMsg, deadLetter: true });
          // Continua para o próximo item em vez de parar
        } else {
          // Erro recuperável — retry com backoff e parar o loop
          await Queue.retry(item.id, errorMsg);
          await logSync(item.table, item.operation, 'error', errorMsg);
          result.failed++;
          result.errors.push(`${item.table}/${item.operation}: ${errorMsg}`);
          emit('itemFailed', { table: item.table, error: errorMsg });
          break; // Parar apenas para erros recuperáveis (rede, timeout)
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
// Detecção de erros não-recuperáveis (FIX #8)
// ============================================================

/**
 * Verifica se o erro é não-recuperável (retries não vão resolver).
 * Esses itens são movidos para dead letter para não bloquear a fila.
 */
function isNonRecoverableError(errorMsg: string): boolean {
  const msg = errorMsg.toLowerCase();
  return (
    msg.includes('row-level security') ||
    msg.includes('new row violates') ||
    msg.includes('violates foreign key') ||
    msg.includes('duplicate key') ||
    msg.includes('unique constraint') ||
    msg.includes('not found') ||
    msg.includes('permission denied') ||
    msg.includes('violates check constraint') ||
    msg.includes('invalid input syntax')
  );
}

// ============================================================
// Sanitização de PII em logs de erro (LGPD)
// ============================================================

/**
 * Remove dados pessoais (nomes, CPFs, emails) de mensagens de erro
 * antes de persisti-las nos logs de sincronização.
 */
function sanitizePII(msg: string): string {
  let sanitized = msg;
  // CPFs: 000.000.000-00 ou 00000000000
  sanitized = sanitized.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[CPF_REDACTED]');
  // Emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');
  // Nomes completos entre aspas (comum em erros de "nome = 'Fulano de Tal'")
  sanitized = sanitized.replace(/['"]([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][a-záéíóúãõâêîôûç]+(\s+[A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][a-záéíóúãõâêîôûç]+)+)['"]/g, "'[NOME_REDACTED]'");
  return sanitized;
}

// ============================================================
// Tipos de Payloads para sanitização (evita 'any')
// ============================================================

interface FrequenciaPayload {
  turma_id: string; aluno_id: string; data: string;
  tempo: string; status?: string; participacao?: string; disciplina: string;
}

interface ConteudoPayload {
  turma_id: string; data: string; tempo: string;
  objetos?: unknown[]; habilidades?: unknown[]; descricao?: string; disciplina: string;
}

interface AvaliacaoPayload {
  turma_id: string; tipo: string; data: string; instrumento?: string;
  objetos?: Array<{ objeto?: string; unidade?: string }>;
  bimestre: string; valor_maximo?: number; disciplina: string;
  id?: string | number; parent_id?: string | number;
}

interface NotaPayload {
  avaliacao_id: string; aluno_id: string; valor: unknown;
}

interface FechamentoPayload {
  turma_id: string; disciplina: string; bimestre: string;
  status?: string; usuario_fechamento_id?: string;
}

// ============================================================
// Sanitização e Validação de Payloads (Segurança / Integridade)
// ============================================================

function sanitizeFrequencia(payload: FrequenciaPayload): Record<string, unknown> {
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

function sanitizeConteudo(payload: ConteudoPayload): Record<string, unknown> {
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

function sanitizeAvaliacao(payload: AvaliacaoPayload): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    turma_id: String(payload.turma_id),
    tipo: String(payload.tipo),
    data: String(payload.data),
    instrumento: String(payload.instrumento || ''),
    objetos: Array.isArray(payload.objetos)
      ? payload.objetos.map((obj) => ({
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

function sanitizeNota(payload: NotaPayload): Record<string, unknown> {
  const valor = Number(payload.valor);
  if (isNaN(valor) || valor < 0 || valor > 1000) {
    throw new Error(`Valor de nota inválido: ${payload.valor} (deve ser numérico entre 0 e 1000)`);
  }
  return {
    avaliacao_id: String(payload.avaliacao_id),
    aluno_id: String(payload.aluno_id),
    valor,
  };
}

function sanitizeFechamento(payload: FechamentoPayload): Record<string, unknown> {
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

async function processItem(item: SyncQueueItem): Promise<string | null> {
  if (!item) throw new Error('Item nulo');

  // FIX: Proteger contra payloads corrompidos no IndexedDB
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(item.payload);
  } catch (parseErr) {
    throw new Error(`[DEAD_LETTER] Payload JSON corrompido na fila (table=${item.table}, id=${item.id}): ${parseErr}`);
  }

  switch (item.table) {
    case 'frequencias':
      await syncFrequencia(item.operation, payload);
      return null;
    case 'conteudos':
      await syncConteudo(item.operation, payload);
      return null;
    case 'avaliacoes':
      return await syncAvaliacao(item.operation, payload);
    case 'notas':
      await syncNotas(item.operation, payload);
      return null;
    case 'fechamentos':
      await syncFechamento(item.operation, payload);
      return null;
    default:
      throw new Error(`[DEAD_LETTER] Tabela desconhecida: ${item.table}`);
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
  const sanitized = sanitizeConteudo(payload as unknown as ConteudoPayload);
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

async function syncAvaliacao(operation: string, payload: Record<string, unknown>): Promise<string | null> {
  if (operation === 'DELETE') {
    const { error } = await supabase.from('avaliacoes').delete().eq('id', payload.id);
    if (error) throw error;
    return null;
  }

  const sanitized = sanitizeAvaliacao(payload as unknown as AvaliacaoPayload);

  // Se tem ID do server, é update
  if (sanitized.id) {
    const { error } = await supabase
      .from('avaliacoes')
      .update(sanitized)
      .eq('id', sanitized.id);
    if (error) throw error;
    return String(sanitized.id);
  } else {
    // Insert
    const { data, error } = await supabase
      .from('avaliacoes')
      .insert([sanitized])
      .select('id')
      .single();
    if (error) throw error;
    return data ? String(data.id) : null;
  }
}

async function syncNotas(operation: string, payload: Record<string, unknown>): Promise<void> {
  // Notas sempre são upsert em batch ou individual
  const records = Array.isArray(payload.records) ? payload.records : [payload];
  const sanitizedRecords = records.map(r => sanitizeNota(r as unknown as NotaPayload));
  const { error } = await supabase
    .from('notas')
    .upsert(sanitizedRecords, { onConflict: 'avaliacao_id,aluno_id' });
  if (error) throw error;
}

async function syncFechamento(operation: string, payload: Record<string, unknown>): Promise<void> {
  const sanitized = sanitizeFechamento(payload as unknown as FechamentoPayload);
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

/** Atualiza as referências locais e da fila de um ID temporário de avaliação para o UUID final */
async function updateTempAvaliacaoId(localId: number, serverId: string): Promise<void> {
  const timestamp = now();
  const tempIdString = `temp_${localId}`;

  await db.transaction('rw', [db.avaliacoes, db.notas, db.syncQueue], async () => {
    // 1. Atualizar registro local da avaliação
    await db.avaliacoes.update(localId, {
      id: serverId,
      syncStatus: 'synced',
      updatedAt: timestamp,
    });

    // 2. Atualizar notas locais associadas
    const notasAfetadas = await db.notas.where('avaliacao_id').equals(tempIdString).toArray();
    for (const nota of notasAfetadas) {
      if (nota.localId) {
        await db.notas.update(nota.localId, {
          avaliacao_id: serverId,
          updatedAt: timestamp,
        });
      }
    }

    // 3. Atualizar payloads das operações pendentes de notas e avaliações na fila (syncQueue)
    const queueItems = await db.syncQueue.where('status').equals('pending').toArray();
    for (const item of queueItems) {
      let payloadChanged = false;
      const payloadObj = JSON.parse(item.payload);

      // Se for a tabela notas
      if (item.table === 'notas') {
        if (payloadObj.avaliacao_id === tempIdString) {
          payloadObj.avaliacao_id = serverId;
          payloadChanged = true;
        }
        if (Array.isArray(payloadObj.records)) {
          payloadObj.records = payloadObj.records.map((r: Record<string, unknown>) => {
            if (r.avaliacao_id === tempIdString) {
              r.avaliacao_id = serverId;
              payloadChanged = true;
            }
            return r;
          });
        }
      }

      // Se for tabela avaliacoes (ex: um UPDATE ou DELETE posterior)
      if (item.table === 'avaliacoes') {
        if (payloadObj.id === tempIdString) {
          payloadObj.id = serverId;
          payloadChanged = true;
        }
        if (payloadObj.parent_id === tempIdString) {
          payloadObj.parent_id = serverId;
          payloadChanged = true;
        }
      }

      if (payloadChanged && item.id) {
        // Recalcular hash para consistência com o novo payload
        const newHash = await hashOperation(item.table, item.operation, payloadObj);
        await db.syncQueue.update(item.id, {
          payload: JSON.stringify(payloadObj),
          hash: newHash,
          updatedAt: timestamp,
        });
      }
    }
  });
}

/** Atualiza o syncStatus do registro local para 'synced' */
async function markLocalRecordSynced(item: { table: string; localId?: number }): Promise<void> {
  if (!item.localId) return;
  
  const timestamp = now();
  const table = getOperationalTable(item.table);
  
  if (table) {
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
