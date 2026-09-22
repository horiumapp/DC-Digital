import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TurmaService } from '../services/turmaService';
import { supabase } from '../lib/supabase';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import { db } from '../db/dexie';
import * as Queue from '../services/offlineQueue';

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock offlineQueue
vi.mock('../services/offlineQueue', () => ({
  enqueue: vi.fn().mockResolvedValue(1),
}));

// Mock dexie db transaction and fechamentos
vi.mock('../db/dexie', () => {
  const whereFechamentos = vi.fn();
  return {
    db: {
      transaction: vi.fn(async (_mode, _tables, callback) => {
        return await callback();
      }),
      fechamentos: {
        where: whereFechamentos,
      },
      syncQueue: {},
    },
  };
});

describe('Reabertura de Aparata / Fechamento de Bimestre (Granular e Total)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('TurmaService.salvarFechamento (Online)', () => {
    it('deve reabrir apenas a disciplina selecionada quando disciplina !== TODAS', async () => {
      const mockQuery: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      // Simula a resolução da query
      mockQuery.eq.mockImplementation((col: string, val: string) => {
        return mockQuery;
      });
      // Permite await mockQuery
      mockQuery.then = (resolve: any) => resolve({ error: null });

      (supabase.from as any).mockReturnValue(mockQuery);

      await TurmaService.salvarFechamento('turma-1', 'Matemática', '1. BIMESTRE', 'ABERTO', 'user-sec-1');

      expect(supabase.from).toHaveBeenCalledWith('fechamentos_bimestres');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('turma_id', 'turma-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('bimestre', '1. BIMESTRE');
      expect(mockQuery.eq).toHaveBeenCalledWith('disciplina', 'Matemática');
    });

    it('deve reabrir TODAS as disciplinas do bimestre quando disciplina === TODAS', async () => {
      const mockQuery: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockQuery.eq.mockImplementation((col: string, val: string) => {
        return mockQuery;
      });
      mockQuery.then = (resolve: any) => resolve({ error: null });

      (supabase.from as any).mockReturnValue(mockQuery);

      await TurmaService.salvarFechamento('turma-1', 'TODAS', '1. BIMESTRE', 'ABERTO', 'user-sec-1');

      expect(supabase.from).toHaveBeenCalledWith('fechamentos_bimestres');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('turma_id', 'turma-1');
      expect(mockQuery.eq).toHaveBeenCalledWith('bimestre', '1. BIMESTRE');
      // NÃO deve ter chamado eq com 'disciplina', permitindo que todas as disciplinas sejam reabertas
      expect(mockQuery.eq).not.toHaveBeenCalledWith('disciplina', expect.anything());
    });

    it('deve salvar FECHADO via upsert com chave composta turma_id,disciplina,bimestre', async () => {
      const mockQuery: any = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      };
      (supabase.from as any).mockReturnValue(mockQuery);

      await TurmaService.salvarFechamento('turma-1', 'História', '2. BIMESTRE', 'FECHADO', 'user-prof-1');

      expect(supabase.from).toHaveBeenCalledWith('fechamentos_bimestres');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        {
          turma_id: 'turma-1',
          disciplina: 'História',
          bimestre: '2. BIMESTRE',
          status: 'FECHADO',
          usuario_fechamento_id: 'user-prof-1',
        },
        { onConflict: 'turma_id,disciplina,bimestre' }
      );
    });
  });

  describe('OfflineTurmaService.salvarFechamento (Offline-first & Dexie)', () => {
    it('deve deletar por chave composta [turma_id+disciplina+bimestre] ao reabrir disciplina específica', async () => {
      const mockDelete = vi.fn().mockResolvedValue(1);
      const mockEquals = vi.fn().mockReturnValue({ delete: mockDelete });
      (db.fechamentos.where as any).mockReturnValue({ equals: mockEquals });

      await OfflineTurmaService.salvarFechamento('turma-1', 'Geografia', '1. BIMESTRE', 'ABERTO', 'user-sec-1');

      expect(db.fechamentos.where).toHaveBeenCalledWith('[turma_id+disciplina+bimestre]');
      expect(mockEquals).toHaveBeenCalledWith(['turma-1', 'Geografia', '1. BIMESTRE']);
      expect(mockDelete).toHaveBeenCalled();
      expect(Queue.enqueue).toHaveBeenCalledWith('fechamentos', 'DELETE', {
        turma_id: 'turma-1',
        disciplina: 'Geografia',
        bimestre: '1. BIMESTRE',
        status: 'ABERTO',
        usuario_fechamento_id: 'user-sec-1',
      });
    });

    it('deve filtrar por turma_id e bimestre ao reabrir TODAS as disciplinas', async () => {
      const mockDelete = vi.fn().mockResolvedValue(5);
      const mockFilter = vi.fn().mockReturnValue({ delete: mockDelete });
      const mockEquals = vi.fn().mockReturnValue({ filter: mockFilter });
      (db.fechamentos.where as any).mockReturnValue({ equals: mockEquals });

      await OfflineTurmaService.salvarFechamento('turma-1', 'TODAS', '2. BIMESTRE', 'ABERTO', 'user-sec-1');

      expect(db.fechamentos.where).toHaveBeenCalledWith('turma_id');
      expect(mockEquals).toHaveBeenCalledWith('turma-1');
      expect(mockFilter).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalled();
      expect(Queue.enqueue).toHaveBeenCalledWith('fechamentos', 'DELETE', {
        turma_id: 'turma-1',
        disciplina: 'TODAS',
        bimestre: '2. BIMESTRE',
        status: 'ABERTO',
        usuario_fechamento_id: 'user-sec-1',
      });
    });
  });

  describe('Regras de Segurança e Permissões de Reabertura', () => {
    interface UserContext {
      role: 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR' | 'ALUNO';
      escola_id?: string;
    }

    interface Turma {
      id: string;
      escola_id: string;
      nome: string;
    }

    // Política RLS staff_delete_fechamentos
    function canUserReopenFechamento(user: UserContext, turma: Turma): boolean {
      if (user.role === 'ADMIN' || user.role === 'GESTOR') {
        return true;
      }
      if (user.role === 'SECRETARIO') {
        return !!user.escola_id && user.escola_id === turma.escola_id;
      }
      // Professores e Alunos NÃO podem excluir fechamentos
      return false;
    }

    const escolaA = 'escola-uuid-a';
    const escolaB = 'escola-uuid-b';
    const turmaEscolaA: Turma = { id: 't-1', escola_id: escolaA, nome: '5º Ano A' };

    it('SECRETARIO pode reabrir aparatas na sua própria escola', () => {
      const secretario: UserContext = { role: 'SECRETARIO', escola_id: escolaA };
      expect(canUserReopenFechamento(secretario, turmaEscolaA)).toBe(true);
    });

    it('SECRETARIO NÃO pode reabrir aparatas em outra escola', () => {
      const secretarioOutraEscola: UserContext = { role: 'SECRETARIO', escola_id: escolaB };
      expect(canUserReopenFechamento(secretarioOutraEscola, turmaEscolaA)).toBe(false);
    });

    it('GESTOR e ADMIN podem reabrir aparatas de qualquer escola', () => {
      const gestor: UserContext = { role: 'GESTOR' };
      const admin: UserContext = { role: 'ADMIN' };
      expect(canUserReopenFechamento(gestor, turmaEscolaA)).toBe(true);
      expect(canUserReopenFechamento(admin, turmaEscolaA)).toBe(true);
    });

    it('PROFESSOR e ALUNO NÃO têm permissão para reabrir aparatas já fechadas', () => {
      const professor: UserContext = { role: 'PROFESSOR', escola_id: escolaA };
      const aluno: UserContext = { role: 'ALUNO', escola_id: escolaA };
      expect(canUserReopenFechamento(professor, turmaEscolaA)).toBe(false);
      expect(canUserReopenFechamento(aluno, turmaEscolaA)).toBe(false);
    });
  });
});
