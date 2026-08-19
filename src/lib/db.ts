/**
 * db.ts — Schema do banco local IndexedDB via Dexie.js
 * 
 * Armazena dados offline para sincronização com o Supabase.
 * Cada tabela operacional inclui campos de controle: syncStatus, updatedAt, version.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Alocacao } from '../contexts/AuthContext';

// ============================================================
// Tipos das entidades locais
// ============================================================

export type SyncStatus = 'pending' | 'synced' | 'error';
export type QueueOperation = 'INSERT' | 'UPDATE' | 'UPSERT' | 'DELETE';
export type QueueStatus = 'pending' | 'processing' | 'done' | 'error';

/** Turma cacheada localmente */
export interface LocalTurma {
  id: string;
  nome: string;
  turno: string;
  ensino?: string;
  escola_id?: string;
  syncStatus: SyncStatus;
  updatedAt: string;
}

/** Aluno cacheado localmente */
export interface LocalAluno {
  id: string;
  nome: string;
  cpf?: string;
  status?: string;
  turma_id: string;
  syncStatus: SyncStatus;
  updatedAt: string;
}

/** Frequência (operação diária) */
export interface LocalFrequencia {
  localId?: number;
  serverId?: string;
  turma_id: string;
  aluno_id: string;
  data: string;
  tempo: string;
  status: string;
  participacao: string;
  disciplina: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Conteúdo ministrado (operação diária) */
export interface LocalConteudo {
  localId?: number;
  serverId?: string;
  turma_id: string;
  data: string;
  tempo: string;
  objetos: string[];
  habilidades: string[];
  descricao: string;
  disciplina: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Avaliação */
export interface LocalAvaliacao {
  localId?: number;
  serverId?: string;
  id?: string; // server ID when synced
  // FIX C4: ID temporário gerado pela UI (ex: temp_<Date.now>) que deve viajar
  // com o registro local para que notas pendentes referenciando-o sejam
  // resolvidas após a sincronização da avaliação.
  clientTempId?: string;
  turma_id: string;
  tipo: string;
  data: string;
  instrumento: string;
  objetos: Array<{ objeto: string; unidade: string }>;
  bimestre: string;
  valor_maximo: number;
  disciplina: string;
  parent_id?: string | number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Nota */
export interface LocalNota {
  localId?: number;
  serverId?: string;
  avaliacao_id: string;
  aluno_id: string;
  valor: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Horário do professor (somente leitura/cache) */
export interface LocalHorario {
  localId?: number;
  turma_id: string;
  dia_semana: number;
  tempo_ordem: number;
  componente: string;
  syncStatus: SyncStatus;
  updatedAt: string;
}

/** Fechamento de bimestre */
export interface LocalFechamento {
  localId?: number;
  serverId?: string;
  turma_id: string;
  disciplina: string;
  bimestre: string;
  status: string;
  usuario_fechamento_id?: string;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/** Unidade curricular cacheada para consulta BNCC offline (somente leitura). */
export interface LocalCurriculoUnidade {
  id: string;
  modalidade: string;
  ano: string;
  bimestre: string;
  disciplina: string;
  nome: string;
  objetos: Array<{ id?: string; unidade_id?: string; descricao: string }>;
  habilidades: Array<{ id?: string; unidade_id?: string; codigo: string }>;
  updatedAt: string;
}
/** Fila de sincronização */
export interface SyncQueueItem {
  id?: number;
  table: string;
  operation: QueueOperation;
  payload: string; // JSON stringified
  status: QueueStatus;
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  lastError?: string;
  localId?: number; // referência ao registro local
  hash: string; // hash para deduplicação
  retryAfter?: string; // timestamp ISO de quando o item pode ser retentado
}

/** Log de sincronização */
export interface SyncLogEntry {
  id?: number;
  timestamp: string;
  table: string;
  operation: QueueOperation;
  status: 'success' | 'error' | 'conflict';
  details?: string;
  localId?: number;
  serverId?: string;
}

/** Salt de criptografia por usuário */
export interface LocalUserSalt {
  userId: string;
  salt: string;
  cryptoKey?: CryptoKey;
}

/** Usuário cacheado (para acesso offline) */
export interface CachedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  escola_id?: string;
  cachedAt: string;
  alocacoes?: Alocacao[];
  professorDisciplinas?: string;
}

/** Arquivo offline */
export interface LocalFile {
  localId?: number;
  blob: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  relatedTable?: string;
  relatedId?: string;
  syncStatus: SyncStatus;
  createdAt: string;
}

// ============================================================
// Database Class
// ============================================================

export class DCDigitalDB extends Dexie {
  turmas!: EntityTable<LocalTurma, 'id'>;
  alunos!: EntityTable<LocalAluno, 'id'>;
  frequencias!: EntityTable<LocalFrequencia, 'localId'>;
  conteudos!: EntityTable<LocalConteudo, 'localId'>;
  avaliacoes!: EntityTable<LocalAvaliacao, 'localId'>;
  notas!: EntityTable<LocalNota, 'localId'>;
  horarios!: EntityTable<LocalHorario, 'localId'>;
  fechamentos!: EntityTable<LocalFechamento, 'localId'>;
  curriculos!: EntityTable<LocalCurriculoUnidade, 'id'>;
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  syncLogs!: EntityTable<SyncLogEntry, 'id'>;
  cachedUsers!: EntityTable<CachedUser, 'id'>;
  files!: EntityTable<LocalFile, 'localId'>;
  userSalts!: EntityTable<LocalUserSalt, 'userId'>;

  constructor() {
    super('DCDigitalDB');

    this.version(1).stores({
      // Dados operacionais
      turmas:      'id, escola_id',
      alunos:      'id, turma_id, syncStatus',
      frequencias: '++localId, [turma_id+aluno_id+data+tempo+disciplina], turma_id, syncStatus',
      conteudos:   '++localId, [turma_id+data+tempo+disciplina], turma_id, syncStatus',
      avaliacoes:  '++localId, turma_id, disciplina, syncStatus, id',
      notas:       '++localId, avaliacao_id, [avaliacao_id+aluno_id], syncStatus',
      horarios:    '++localId, turma_id',
      fechamentos: '++localId, [turma_id+disciplina+bimestre], syncStatus',

      // Sistema
      syncQueue:   '++id, table, status, createdAt, hash',
      syncLogs:    '++id, timestamp, table, status',
      cachedUsers: 'id',
      files:       '++localId, syncStatus, relatedTable, relatedId',
    });

    this.version(2).stores({
      // Dados operacionais
      turmas:      'id, escola_id',
      alunos:      'id, turma_id, syncStatus',
      frequencias: '++localId, [turma_id+aluno_id+data+tempo+disciplina], turma_id, syncStatus',
      conteudos:   '++localId, [turma_id+data+tempo+disciplina], turma_id, syncStatus',
      avaliacoes:  '++localId, turma_id, disciplina, syncStatus, id',
      notas:       '++localId, avaliacao_id, [avaliacao_id+aluno_id], syncStatus',
      horarios:    '++localId, turma_id',
      fechamentos: '++localId, [turma_id+disciplina+bimestre], syncStatus',

      // Sistema
      syncQueue:   '++id, table, status, createdAt, hash',
      syncLogs:    '++id, timestamp, table, status',
      cachedUsers: 'id',
      files:       '++localId, syncStatus, relatedTable, relatedId',
      userSalts:   'userId',
    });

    // FIX #17: Adicionar índice updatedAt para limpeza eficiente de dados antigos
    // Permite range queries em vez de iteração JavaScript completa
    this.version(3).stores({
      // Dados operacionais — adicionar índice updatedAt
      turmas:      'id, escola_id',
      alunos:      'id, turma_id, syncStatus',
      frequencias: '++localId, [turma_id+aluno_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt',
      conteudos:   '++localId, [turma_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt',
      avaliacoes:  '++localId, turma_id, disciplina, syncStatus, id',
      notas:       '++localId, avaliacao_id, [avaliacao_id+aluno_id], syncStatus',
      horarios:    '++localId, turma_id',
      fechamentos: '++localId, [turma_id+disciplina+bimestre], syncStatus',

      // Sistema
      syncQueue:   '++id, table, status, createdAt, hash',
      syncLogs:    '++id, timestamp, table, status',
      cachedUsers: 'id',
      files:       '++localId, syncStatus, relatedTable, relatedId',
      userSalts:   'userId',
    });

    // v4: Adiciona índice composto [syncStatus+updatedAt] em TODAS as tabelas operacionais
    // Permite que clearOldSyncedData faça range queries eficientes via índice
    // em vez de filtrar via JavaScript (padrão anterior)
    this.version(4).stores({
      turmas:      'id, escola_id',
      alunos:      'id, turma_id, syncStatus',
      frequencias: '++localId, [turma_id+aluno_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt, [syncStatus+updatedAt]',
      conteudos:   '++localId, [turma_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt, [syncStatus+updatedAt]',
      avaliacoes:  '++localId, turma_id, disciplina, syncStatus, id, [syncStatus+updatedAt]',
      notas:       '++localId, avaliacao_id, [avaliacao_id+aluno_id], syncStatus, [syncStatus+updatedAt]',
      horarios:    '++localId, turma_id',
      fechamentos: '++localId, [turma_id+disciplina+bimestre], syncStatus, [syncStatus+updatedAt]',

      syncQueue:   '++id, table, status, createdAt, hash',
      syncLogs:    '++id, timestamp, table, status',
      cachedUsers: 'id',
      files:       '++localId, syncStatus, relatedTable, relatedId',
      userSalts:   'userId',
    });

    // v5: Adiciona índice updatedAt individual em avaliacoes e notas.
    // A v4 tinha [syncStatus+updatedAt] composto, mas sem updatedAt simples,
    // impedindo range queries de limpeza baseadas apenas em data.
    // Alinha esses campos com frequencias e conteudos que já tinham updatedAt individual.
    this.version(5).stores({
      turmas:      'id, escola_id',
      alunos:      'id, turma_id, syncStatus',
      frequencias: '++localId, [turma_id+aluno_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt, [syncStatus+updatedAt]',
      conteudos:   '++localId, [turma_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt, [syncStatus+updatedAt]',
      avaliacoes:  '++localId, turma_id, disciplina, syncStatus, id, updatedAt, [syncStatus+updatedAt]',
      notas:       '++localId, avaliacao_id, [avaliacao_id+aluno_id], syncStatus, updatedAt, [syncStatus+updatedAt]',
      horarios:    '++localId, turma_id',
      fechamentos: '++localId, [turma_id+disciplina+bimestre], syncStatus, [syncStatus+updatedAt]',

      syncQueue:   '++id, table, status, createdAt, hash',
      syncLogs:    '++id, timestamp, table, status',
      cachedUsers: 'id',
      files:       '++localId, syncStatus, relatedTable, relatedId',
      userSalts:   'userId',
    });
    // v6: Cache somente leitura do currículo BNCC para consulta offline.
    this.version(6).stores({
      turmas:      'id, escola_id',
      alunos:      'id, turma_id, syncStatus',
      frequencias: '++localId, [turma_id+aluno_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt, [syncStatus+updatedAt]',
      conteudos:   '++localId, [turma_id+data+tempo+disciplina], turma_id, syncStatus, updatedAt, [syncStatus+updatedAt]',
      avaliacoes:  '++localId, turma_id, disciplina, syncStatus, id, updatedAt, [syncStatus+updatedAt]',
      notas:       '++localId, avaliacao_id, [avaliacao_id+aluno_id], syncStatus, updatedAt, [syncStatus+updatedAt]',
      horarios:    '++localId, turma_id',
      fechamentos: '++localId, [turma_id+disciplina+bimestre], syncStatus, [syncStatus+updatedAt]',
      curriculos:  'id, [modalidade+ano+bimestre+disciplina]',

      syncQueue:   '++id, table, status, createdAt, hash',
      syncLogs:    '++id, timestamp, table, status',
      cachedUsers: 'id',
      files:       '++localId, syncStatus, relatedTable, relatedId',
      userSalts:   'userId',
    });
  }
}

// Singleton
export const db = new DCDigitalDB();

// ============================================================
// Helpers
// ============================================================

/**
 * Acesso tipado a tabelas operacionais do banco.
 * Elimina type assertions perigosas como `(db as unknown as Record<...>)[name]`.
 */
type OperationalTableName = 'frequencias' | 'conteudos' | 'avaliacoes' | 'notas' | 'fechamentos';
type OperationalTable = typeof db.frequencias | typeof db.conteudos | typeof db.avaliacoes | typeof db.notas | typeof db.fechamentos;

const OPERATIONAL_TABLES: Record<OperationalTableName, () => OperationalTable> = {
  frequencias: () => db.frequencias,
  conteudos:   () => db.conteudos,
  avaliacoes:  () => db.avaliacoes,
  notas:       () => db.notas,
  fechamentos: () => db.fechamentos,
};

/**
 * Retorna a tabela operacional pelo nome, de forma tipada e segura.
 * Retorna undefined para nomes desconhecidos.
 */
export function getOperationalTable(name: string): OperationalTable | undefined {
  const getter = OPERATIONAL_TABLES[name as OperationalTableName];
  return getter ? getter() : undefined;
}

/** Lista de nomes de tabelas operacionais (para iteração segura) */
export const OPERATIONAL_TABLE_NAMES: OperationalTableName[] = ['frequencias', 'conteudos', 'avaliacoes', 'notas', 'fechamentos'];

/** Gera timestamp ISO atual */
export const now = (): string => new Date().toISOString();

/** Gera um hash SHA-256 truncado para deduplicação de operações na fila */
export async function hashOperation(
  table: string,
  operation: QueueOperation,
  payload: Record<string, unknown>,
  discriminator?: string | number
): Promise<string> {
  // Usa as chaves mais relevantes para cada tabela
  const keyFields: Record<string, string[]> = {
    frequencias: ['turma_id', 'aluno_id', 'data', 'tempo', 'disciplina'],
    conteudos: ['turma_id', 'data', 'tempo', 'disciplina'],
    avaliacoes: ['id', 'parent_id', 'turma_id', 'disciplina', 'data', 'tipo'],
    notas: ['avaliacao_id', 'aluno_id'],
    fechamentos: ['turma_id', 'disciplina', 'bimestre'],
    security_logs: ['user_id', 'action', 'created_at', 'entity_id'],
  };

  // FIX C3: Operações em lote ({ records: [...] }) eram hasheadas pelas chaves
  // de topo (ausentes no payload), então TODOS os lotes de frequencias e notas
  // colidiam no mesmo hash e a fila substituía um lote pelo outro — o primeiro
  // nunca era sincronizado e acabava sendo purgado como "synced".
  // Agora o hash é calculado sobre os registros normalizados e ordenados.
  if (Array.isArray(payload.records)) {
    const fields = keyFields[table] || [];
    const recordsKey = payload.records
      .map((r: Record<string, unknown>) => fields.map(f => r?.[f] ?? '').join('|'))
      .sort()
      .join(';');
    return buildHashKey(`${table}:${operation}:batch:${recordsKey}`);
  }

  const fields = keyFields[table] || Object.keys(payload);
  let key = `${table}:${operation}:${fields.map(f => payload[f] ?? '').join('|')}`;

  // Se houver array de aluno_ids (ex: DELETE em lote de notas)
  if (Array.isArray(payload.aluno_ids)) {
    const sortedAlunos = payload.aluno_ids.map(String).sort().join(',');
    key = `${table}:${operation}:avaliacao:${String(payload.avaliacao_id ?? '')}:aluno_ids:${sortedAlunos}`;
  }

  // FIX C3: DELETEs com id explícito
  if (operation === 'DELETE' && payload.id !== undefined) {
    key = `${table}:DELETE:id:${String(payload.id)}`;
  }

  // FIX C3: INSERTs sem identidade no payload usam o localId como discriminador
  if (operation === 'INSERT' && discriminator !== undefined) {
    key = `${key}:local:${String(discriminator)}`;
  }

  return buildHashKey(key);
}

function buildHashKey(key: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
      const msgUint8 = new TextEncoder().encode(key);
      return crypto.subtle.digest('SHA-256', msgUint8).then(hashBuffer => {
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.slice(0, 32);
      });
    }
  } catch (err) {
    console.warn('SubtleCrypto error, falling back to DJB2:', err);
  }

  // Fallback síncrono
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Promise.resolve('fb_' + Math.abs(hash).toString(36));
}

