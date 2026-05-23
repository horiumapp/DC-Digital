/**
 * db.ts — Schema do banco local IndexedDB via Dexie.js
 * 
 * Armazena dados offline para sincronização com o Supabase.
 * Cada tabela operacional inclui campos de controle: syncStatus, updatedAt, version.
 */
import Dexie, { type EntityTable } from 'dexie';

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

/** Usuário cacheado (para acesso offline) */
export interface CachedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  title: string;
  escola_id?: string;
  cachedAt: string;
  alocacoes?: any[];
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
  syncQueue!: EntityTable<SyncQueueItem, 'id'>;
  syncLogs!: EntityTable<SyncLogEntry, 'id'>;
  cachedUsers!: EntityTable<CachedUser, 'id'>;
  files!: EntityTable<LocalFile, 'localId'>;

  constructor() {
    super('DCDigitalDB');

    this.version(1).stores({
      // Dados operacionais
      turmas:      'id, escola_id',
      alunos:      'id, turma_id, syncStatus',
      frequencias: '++localId, [turma_id+aluno_id+data+tempo+disciplina], turma_id, syncStatus',
      conteudos:   '++localId, [turma_id+data+tempo+disciplina], turma_id, syncStatus',
      avaliacoes:  '++localId, turma_id, disciplina, syncStatus, id',
      notas:       '++localId, [avaliacao_id+aluno_id], syncStatus',
      horarios:    '++localId, turma_id',
      fechamentos: '++localId, [turma_id+disciplina+bimestre], syncStatus',

      // Sistema
      syncQueue:   '++id, table, status, createdAt, hash',
      syncLogs:    '++id, timestamp, table, status',
      cachedUsers: 'id',
      files:       '++localId, syncStatus, relatedTable, relatedId',
    });
  }
}

// Singleton
export const db = new DCDigitalDB();

// ============================================================
// Helpers
// ============================================================

/** Gera timestamp ISO atual */
export const now = (): string => new Date().toISOString();

/** Gera um hash simples para deduplicação de operações na fila */
export function hashOperation(table: string, operation: QueueOperation, payload: Record<string, unknown>): string {
  // Usa as chaves mais relevantes para cada tabela
  const keyFields: Record<string, string[]> = {
    frequencias: ['turma_id', 'aluno_id', 'data', 'tempo', 'disciplina'],
    conteudos: ['turma_id', 'data', 'tempo', 'disciplina'],
    avaliacoes: ['turma_id', 'disciplina', 'data', 'tipo'],
    notas: ['avaliacao_id', 'aluno_id'],
    fechamentos: ['turma_id', 'disciplina', 'bimestre'],
  };
  
  const fields = keyFields[table] || Object.keys(payload);
  const key = `${table}:${operation}:${fields.map(f => payload[f] ?? '').join('|')}`;
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
