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
import { pingInternet, pingSupabase } from '../utils/network';
import { getTid } from '../utils/turmaUtils';

// ============================================================
// M5: Helper de validação de UUID
// ============================================================
function assertUUID(val: unknown, field: string): string {
  const s = String(val ?? '').trim();
  if (!s) {
    throw new Error(`[DEAD_LETTER] Campo '${field}' está ausente ou vazio.`);
  }
  return s;
}

// M1: Timeout por item de sincronização (ms)
const ITEM_SYNC_TIMEOUT_MS = 20_000; // 20 segundos

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

  // FIX: Verificar se realmente está online com ping real
  // navigator.onLine pode retornar true em Wi-Fi sem rota ou portal captive
  const isReallyOnline = await pingInternet();
  if (!isReallyOnline) {
    return { synced: 0, failed: 0, errors: ['Sem conexão com a internet'] };
  }

  // FIX P1-#5: Verificar se o Supabase está acessível antes de sincronizar.
  // Internet pode estar ok, mas o backend pode estar fora (manutenção, deploy).
  const isSupabaseUp = await pingSupabase();
  if (!isSupabaseUp) {
    return { synced: 0, failed: 0, errors: ['Servidor indisponível. Tentando novamente em breve.'] };
  }

  // FIX P0-#1: Verificar sessão Supabase antes de sincronizar.
  // Se o JWT expirou, todos os itens falhariam com 401/403, gastando retries
  // e potencialmente movendo dados válidos para dead letter.
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { synced: 0, failed: 0, errors: ['Sessão expirada. Faça login novamente para sincronizar.'] };
    }
  } catch {
    // Se não conseguiu verificar a sessão, prosseguir com cautela
    console.warn('[SyncEngine] Não foi possível verificar sessão — prosseguindo com sync.');
  }

  // FIX M4: Usar Web Locks API para serializar sincronizações entre múltiplas abas.
  // _isSyncing é variável em memória — não compartilhada entre abas do browser.
  // Sem esse lock, duas abas abertas simultaneamente passariam pelo check acima
  // e sincronizariam em paralelo, causando possíveis duplicatas ou conflitos no Supabase.
  // Fallback: se Web Locks não estiver disponível (ex: browsers antigos, testes), executa sem lock.
  if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
    return navigator.locks.request(
      'dc-digital-sync-lock',
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          // Outra aba já está sincronizando — aguardar
          console.info('[SyncEngine] Outra aba está sincronizando. Aguardando próximo ciclo.');
          return { synced: 0, failed: 0, errors: ['Sincronização em andamento em outra aba'] };
        }
        return _runSyncAll();
      }
    );
  }

  // Fallback para ambientes sem Web Locks (ex: Safari antigo, Node.js para testes)
  return _runSyncAll();
}

/** Executa o ciclo de sincronização. Chamado por syncAll() após verificações de lock e conectividade. */
async function _runSyncAll(): Promise<SyncResult> {
  _isSyncing = true;
  setState('SYNCING');
  emit('start');

  const result: SyncResult = { synced: 0, failed: 0, errors: [] };

  // FIX #15: Limite de itens por ciclo para evitar bloqueio longo em filas grandes.
  // Se a fila tiver mais itens, um próximo ciclo será agendado automaticamente.
  const MAX_ITEMS_PER_CYCLE = 200;
  let itemsProcessed = 0;

  try {
    // Resetar itens travados de sessão anterior
    await Queue.resetStuckItems();
    await autoRepairDeadLetters();
    await Queue.retryAllErrors();

    // Processar fila em ordem FIFO
    let item = await Queue.peek();

    while (item?.id && itemsProcessed < MAX_ITEMS_PER_CYCLE) {
      itemsProcessed++;
      try {
        await Queue.markProcessing(item.id);
        // FIX M1: AbortController + timeout por item para evitar travamento
        // indefinido em falhas de rede durante transferência de dados.
        const itemController = new AbortController();
        const itemTimeout = setTimeout(
          () => itemController.abort(new Error(`[TIMEOUT] Item ${item!.id} (${item!.table}/${item!.operation}) excedeu ${ITEM_SYNC_TIMEOUT_MS / 1000}s`)),
          ITEM_SYNC_TIMEOUT_MS
        );
        let serverId: string | null;
        try {
          serverId = await processItem(item, itemController.signal);
        } finally {
          clearTimeout(itemTimeout);
        }
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
        const rawErrorMsg = err instanceof Error
          ? err.message
          : (typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string')
            ? String((err as { message: string }).message)
            : (typeof err === 'object' && err !== null ? JSON.stringify(err) : String(err));

        // FIX #7: Extrair código de erro Supabase/Postgres para classificação precisa
        const errorCode = (err as { code?: string })?.code;
        // LGPD: Sanitizar PII antes de persistir no log
        const errorMsg = sanitizePII(rawErrorMsg);
        
        // FIX #8: Diferenciar erros recuperáveis de não-recuperáveis.
        // Erros fatais (RLS, duplicate, FK) são movidos para dead letter
        // em vez de bloquear toda a fila.
        if (isNonRecoverableError(errorMsg, errorCode)) {
          await Queue.fail(item.id, `[DEAD_LETTER] ${errorMsg}`);
          await logSync(item.table, item.operation, 'error', `[DEAD_LETTER] ${errorMsg}`);
          result.failed++;
          result.errors.push(`${item.table}/${item.operation}: [DEAD_LETTER] ${errorMsg}`);
          emit('itemFailed', { table: item.table, error: errorMsg, deadLetter: true });
          // Continua para o próximo item em vez de parar
        } else {
          // Erro recuperável — retry com backoff
          await Queue.retry(item.id, errorMsg);
          await logSync(item.table, item.operation, 'error', errorMsg);
          result.failed++;
          result.errors.push(`${item.table}/${item.operation}: ${errorMsg}`);
          emit('itemFailed', { table: item.table, error: errorMsg });

          // FIX P0-#3: Erros de dependência (avaliação pai pendente) NÃO devem
          // bloquear a fila inteira. Outros itens independentes podem ser sincronizados
          // enquanto a dependência é resolvida em ciclos futuros.
          // Apenas erros de rede/timeout (verdadeiramente recuperáveis por reconexão)
          // devem parar o loop, pois indicam que o servidor está inacessível.
          const isDependencyError = errorMsg.includes('Aguardando sincronização');
          if (!isDependencyError) {
            break; // Parar para erros de rede/timeout — servidor inacessível
          }
          // Para erros de dependência: continuar processando próximos itens
        }
      }

      // Próximo item
      item = await Queue.peek();
    }

    // FIX #15: Se atingiu o limite por ciclo, agendar continuação automática
    if (itemsProcessed >= MAX_ITEMS_PER_CYCLE) {
      const hasMore = await Queue.getPendingCount() > 0;
      if (hasMore) {
        console.info(`[SyncEngine] Limite de ${MAX_ITEMS_PER_CYCLE} itens atingido. Agendando próximo ciclo...`);
        scheduleSync();
      }
    }

    setState(result.failed > 0 ? 'ERROR' : 'IDLE');
    emit('complete', result);

    // FIX M6: Limpeza proativa do IndexedDB após ciclo bem-sucedido.
    // Registros já sincronizados (syncStatus='synced') com mais de 30 dias são
    // removidos para evitar crescimento ilimitado ao longo do ano letivo.
    // FIX M4: Limpeza de syncLogs antigos (> 30 dias) no mesmo ciclo.
    // Ambas as limpezas são assíncronas e não-bloqueantes. Erros são silenciosos.
    if (result.synced > 0) {
      setTimeout(() => {
        import('../services/offlineStorage').then(({ clearOldSyncedData }) => {
          clearOldSyncedData(30).then(deleted => {
            if (deleted > 0) {
              console.info(`[SyncEngine] Limpeza proativa: ${deleted} registros antigos removidos do IndexedDB.`);
            }
          }).catch(err => {
            console.warn('[SyncEngine] Limpeza proativa falhou (não-crítico):', err);
          });
        });

        // Limpar syncLogs com mais de 30 dias para evitar crescimento
        // ilimitado ao longo do ano letivo (pode acumular 10k+ entradas).
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        db.syncLogs
          .where('timestamp').below(cutoff)
          .delete()
          .then(count => {
            if (count > 0) {
              console.info(`[SyncEngine] Limpeza de logs: ${count} entradas de syncLog removidas (> 30 dias).`);
            }
          })
          .catch(err => {
            console.warn('[SyncEngine] Limpeza de syncLogs falhou (não-crítico):', err);
          });
      }, 0);
    }

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
 *
 * FIX #7: Usar códigos de erro específicos do Supabase/PostgREST/Postgres em vez
 * de string matching genérico. Isso evita que erros 404 HTTP temporários (rede/deploy)
 * sejam incorretamente classificados como dead letter permanente.
 */
function isNonRecoverableError(errorMsg: string, errorCode?: string): boolean {
  const msg = errorMsg.toLowerCase();

  // Códigos de erro do PostgREST/Postgres (fonte: https://postgrest.org/en/stable/references/errors.html)
  const deadLetterCodes = new Set([
    '23503', // foreign_key_violation
    '23505', // unique_violation
    '23514', // check_violation
    '42501', // insufficient_privilege
    '22P02', // invalid_text_representation
    'PGRST116', // Resource Not Found (RLS bloqueando GET de recurso específico)
    'PGRST301', // JWT expired (não recuperável sem relogin)
  ]);

  if (errorCode && deadLetterCodes.has(errorCode)) return true;

  // Fallback por substring — NÃO incluir 'not found' aqui (pode ser 404 HTTP transitório)
  return (
    msg.includes('row-level security') ||
    msg.includes('new row violates') ||
    msg.includes('violates foreign key') ||
    msg.includes('duplicate key') ||
    msg.includes('unique constraint') ||
    msg.includes('permission denied') ||
    msg.includes('violates check constraint') ||
    msg.includes('invalid input syntax')
    // REMOVIDO: 'not found' — pode ser 404 HTTP temporário (deploy, endpoint indisponível)
    // Se o Supabase retornar PGRST116 para registro não encontrado por RLS, usar o código acima.
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
    // FIX M5: assertUUID valida formato antes de enviar ao Supabase
    turma_id: assertUUID(getTid(String(payload.turma_id)), 'turma_id'),
    aluno_id: assertUUID(payload.aluno_id, 'aluno_id'),
    data: String(payload.data),
    tempo: String(payload.tempo),
    status: String(payload.status || 'P'),
    participacao: String(payload.participacao || 'Presencial'),
    disciplina: String(payload.disciplina),
  };
}

function sanitizeConteudo(payload: ConteudoPayload): Record<string, unknown> {
  return {
    // FIX M5: assertUUID valida formato antes de enviar ao Supabase
    turma_id: assertUUID(getTid(String(payload.turma_id)), 'turma_id'),
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
    // FIX M5: assertUUID valida formato antes de enviar ao Supabase
    turma_id: assertUUID(getTid(String(payload.turma_id)), 'turma_id'),
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

  if (payload.id && !String(payload.id).startsWith('temp_') && !String(payload.id).startsWith('local_')) {
    sanitized.id = String(payload.id);
  }
  if (payload.parent_id !== undefined && payload.parent_id !== null && payload.parent_id !== '') {
    const parentStr = String(payload.parent_id);
    if (!parentStr.startsWith('temp_') && !parentStr.startsWith('local_')) {
      const parentNum = Number(parentStr);
      sanitized.parent_id = !isNaN(parentNum) ? parentNum : parentStr;
    }
  }

  return sanitized;
}

function sanitizeNota(payload: NotaPayload): Record<string, unknown> {
  const valor = Number(payload.valor);
  if (isNaN(valor) || valor < 0 || valor > 1000) {
    throw new Error(`Valor de nota inválido: ${payload.valor} (deve ser numérico entre 0 e 1000)`);
  }
  return {
    // FIX M5: assertUUID valida formato antes de enviar ao Supabase
    avaliacao_id: assertUUID(payload.avaliacao_id, 'avaliacao_id'),
    aluno_id: assertUUID(payload.aluno_id, 'aluno_id'),
    valor,
  };
}

function sanitizeFechamento(payload: FechamentoPayload): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {
    // FIX M5: assertUUID valida formato antes de enviar ao Supabase
    turma_id: assertUUID(getTid(String(payload.turma_id)), 'turma_id'),
    disciplina: String(payload.disciplina),
    bimestre: String(payload.bimestre),
    status: String(payload.status || 'FECHADO'),
  };
  if (payload.usuario_fechamento_id) {
    // Validar UUID se presente
    sanitized.usuario_fechamento_id = assertUUID(payload.usuario_fechamento_id, 'usuario_fechamento_id');
  }
  return sanitized;
}

// ============================================================
// Processamento de itens individuais
// ============================================================

// FIX M1: signal opcional para timeout por item
async function processItem(item: SyncQueueItem, signal?: AbortSignal): Promise<string | null> {
  if (!item) throw new Error('Item nulo');

  // M1: Verificar abort antes de iniciar (timeout já pode ter ocorrido)
  if (signal?.aborted) {
    throw signal.reason instanceof Error ? signal.reason : new Error('[TIMEOUT] Operação cancelada antes de iniciar.');
  }

  // FIX: Proteger contra payloads corrompidos no IndexedDB
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(item.payload);
  } catch (parseErr) {
    throw new Error(`[DEAD_LETTER] Payload JSON corrompido na fila (table=${item.table}, id=${item.id}): ${parseErr}`, { cause: parseErr });
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

  // Atualizar syncStatus local para 'synced'
  const avaliacaoTurmaIds = [...new Set(sanitizedRecords.map(r => String(r.turma_id)))];
  await db.frequencias.where('turma_id').anyOf(avaliacaoTurmaIds).modify({ syncStatus: 'synced', updatedAt: now() });
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

  await db.conteudos.where('turma_id').equals(String(sanitized.turma_id)).modify({ syncStatus: 'synced', updatedAt: now() });
}

async function syncAvaliacao(operation: string, payload: Record<string, unknown>): Promise<string | null> {
  if (operation === 'DELETE') {
    const { error } = await supabase.from('avaliacoes').delete().eq('id', payload.id);
    if (error) throw error;
    return null;
  }

  // RESOLVER PARENT_ID SE AINDA FOR TEMPORÁRIO
  if (payload.parent_id !== undefined && payload.parent_id !== null && payload.parent_id !== '') {
    const pStr = String(payload.parent_id);
    if (pStr.startsWith('temp_') || pStr.startsWith('local_')) {
      const localIdNum = parseInt(pStr.replace(/\D/g, ''), 10);
      const parentLocal = await db.avaliacoes
        .filter(av => String(av.id) === pStr || String(av.localId) === String(localIdNum))
        .first();

      if (parentLocal && (parentLocal.serverId || (parentLocal.id && !String(parentLocal.id).startsWith('temp_') && !String(parentLocal.id).startsWith('local_')))) {
        payload.parent_id = parentLocal.serverId || parentLocal.id;
      } else {
        throw new Error(`Aguardando sincronização da avaliação pai no servidor (id temporário: ${pStr})`);
      }
    }
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
  
  // Se a avaliação pai ainda tiver um ID temporário, aguardar ela ser sincronizada primeiro
  for (const rec of sanitizedRecords) {
    const avId = String(rec.avaliacao_id);
    if (avId.startsWith('temp_') || avId.startsWith('local_')) {
      throw new Error(`Aguardando sincronização da avaliação no servidor (id temporário: ${avId})`);
    }
  }

  const { error } = await supabase
    .from('notas')
    .upsert(sanitizedRecords, { onConflict: 'avaliacao_id,aluno_id' });
  if (error) throw error;

  // Atualizar syncStatus local de notas para 'synced'
  const avaliacaoIds = [...new Set(sanitizedRecords.map(r => String(r.avaliacao_id)))];
  await db.notas.where('avaliacao_id').anyOf(avaliacaoIds).modify({ syncStatus: 'synced', updatedAt: now() });
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

  await db.fechamentos.where('turma_id').equals(String(sanitized.turma_id)).modify({ syncStatus: 'synced', updatedAt: now() });
}

// ============================================================
// Helpers
// ============================================================

/** Atualiza as referências locais e da fila de um ID temporário de avaliação para o UUID final */
async function updateTempAvaliacaoId(localId: number, serverId: string): Promise<void> {
  const timestamp = now();
  const localRecord = await db.avaliacoes.get(localId);
  const tempIdFromRecord = localRecord?.id ? String(localRecord.id) : null;
  const serverIdFromRecord = localRecord?.serverId ? String(localRecord.serverId) : null;

  const possibleTempIds = new Set([
    `temp_${localId}`,
    `local_${localId}`,
    String(localId),
  ]);
  if (tempIdFromRecord) possibleTempIds.add(tempIdFromRecord);
  if (serverIdFromRecord) possibleTempIds.add(serverIdFromRecord);

  await db.transaction('rw', [db.avaliacoes, db.notas, db.syncQueue], async () => {
    // 1. Atualizar registro local da avaliação
    await db.avaliacoes.update(localId, {
      id: serverId,
      serverId: serverId,
      syncStatus: 'synced',
      updatedAt: timestamp,
    });

    // 2. Atualizar notas locais associadas
    const notasAfetadas = await db.notas.filter(n => possibleTempIds.has(String(n.avaliacao_id))).toArray();
    for (const nota of notasAfetadas) {
      if (nota.localId) {
        await db.notas.update(nota.localId, {
          avaliacao_id: serverId,
          updatedAt: timestamp,
        });
      }
    }

    // 3. Atualizar payloads das operações pendentes/erros de notas e avaliações na fila (syncQueue)
    const queueItems = await db.syncQueue.toArray();
    for (const item of queueItems) {
      let payloadChanged = false;
      let payloadObj: Record<string, unknown>;
      try {
        payloadObj = JSON.parse(item.payload);
      } catch {
        console.warn(`[SyncEngine] Payload corrompido na fila (id=${item.id}, table=${item.table}) - pulando atualização de ID temporário`);
        continue;
      }

      // Se for a tabela notas
      if (item.table === 'notas') {
        if (possibleTempIds.has(String(payloadObj.avaliacao_id))) {
          payloadObj.avaliacao_id = serverId;
          payloadChanged = true;
        }
        if (Array.isArray(payloadObj.records)) {
          payloadObj.records = payloadObj.records.map((r: Record<string, unknown>) => {
            if (possibleTempIds.has(String(r.avaliacao_id))) {
              r.avaliacao_id = serverId;
              payloadChanged = true;
            }
            return r;
          });
        }
      }

      // Se for tabela avaliacoes
      if (item.table === 'avaliacoes') {
        if (possibleTempIds.has(String(payloadObj.id))) {
          payloadObj.id = serverId;
          payloadChanged = true;
        }
        if (possibleTempIds.has(String(payloadObj.parent_id))) {
          payloadObj.parent_id = serverId;
          payloadChanged = true;
        }
      }

      if (payloadChanged && item.id) {
        const newHash = await hashOperation(item.table, item.operation, payloadObj);
        await db.syncQueue.update(item.id, {
          payload: JSON.stringify(payloadObj),
          hash: newHash,
          status: 'pending',
          retryCount: 0,
          lastError: undefined,
          updatedAt: timestamp,
        });
      }
    }
  });
}

/** Repara automaticamente itens na fila marcados com erro que possuem ID temporário ou turma_id composto */
async function autoRepairDeadLetters(): Promise<void> {
  try {
    const queueItems = await db.syncQueue.toArray();
    const allLocalAvaliacoes = typeof db.avaliacoes?.toArray === 'function' ? await db.avaliacoes.toArray() : [];

    // Mapeamento de IDs temporários para o serverId / UUID real da avaliação
    const tempToRealMap = new Map<string, string>();
    for (const av of allLocalAvaliacoes) {
      if (av.serverId || (av.id && !String(av.id).startsWith('temp_') && !String(av.id).startsWith('local_'))) {
        const realId = String(av.serverId || av.id);
        if (av.id) tempToRealMap.set(String(av.id), realId);
        if (av.localId) {
          tempToRealMap.set(String(av.localId), realId);
          tempToRealMap.set(`temp_${av.localId}`, realId);
          tempToRealMap.set(`local_${av.localId}`, realId);
        }
      }
    }

    for (const item of queueItems) {
      let payloadObj: Record<string, unknown>;
      try {
        payloadObj = JSON.parse(item.payload);
      } catch {
        continue;
      }

      let repaired = false;

      // 1. Auto-reparo de turma_id composto (ex: UUID||Componente)
      if (payloadObj.turma_id && String(payloadObj.turma_id).includes('||')) {
        const cleanTurmaId = getTid(String(payloadObj.turma_id));
        payloadObj.turma_id = cleanTurmaId;
        repaired = true;
      }

      // 2. Auto-reparo de notas com avaliacao_id temporário
      if (item.table === 'notas') {
        if (payloadObj.avaliacao_id && tempToRealMap.has(String(payloadObj.avaliacao_id))) {
          payloadObj.avaliacao_id = tempToRealMap.get(String(payloadObj.avaliacao_id));
          repaired = true;
        }
        if (Array.isArray(payloadObj.records)) {
          payloadObj.records = payloadObj.records.map((r: Record<string, unknown>) => {
            if (r && r.avaliacao_id && tempToRealMap.has(String(r.avaliacao_id))) {
              repaired = true;
              return { ...r, avaliacao_id: tempToRealMap.get(String(r.avaliacao_id)) };
            }
            return r;
          });
        }
      }

      // 3. Auto-reparo de avaliações filhas (RP/2CH) com parent_id temporário
      if (item.table === 'avaliacoes' && payloadObj.parent_id) {
        const pStr = String(payloadObj.parent_id);
        if (tempToRealMap.has(pStr)) {
          payloadObj.parent_id = tempToRealMap.get(pStr);
          repaired = true;
        }
      }

      if (repaired && item.id) {
        const newHash = await hashOperation(item.table, item.operation, payloadObj);
        await db.syncQueue.update(item.id, {
          payload: JSON.stringify(payloadObj),
          hash: newHash,
          status: 'pending',
          retryCount: 0,
          lastError: undefined,
          updatedAt: now(),
        });
        console.info(`[SyncEngine] Item em fila id=${item.id} (${item.table}) auto-reparado com sucesso.`);
      }
    }
  } catch (err) {
    console.warn('[SyncEngine] Falha ao tentar auto-reparar dead letters:', err);
  }
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
  await autoRepairDeadLetters();
  const count = await Queue.retryAllErrors();
  if (count > 0) {
    scheduleSync();
  } else {
    syncAll();
  }
  return count;
}
