-- =============================================================
-- DC Digital — Correção de Constraints UNIQUE Incorretas
-- Migration: 20260719000005_fix_unique_constraints.sql
-- =============================================================
-- PROBLEMA: As constraints UNIQUE nas tabelas operacionais
-- foram criadas com colunas erradas (ex: UNIQUE (turma_id) em vez
-- de UNIQUE (turma_id, aluno_id, data, ...)), o que impede qualquer
-- segundo registro nessas tabelas.
--
-- IMPACTO: Frequências, notas, conteúdos, horários e alocações
-- de professores não podem ser inseridos normalmente.
--
-- SOLUÇÃO: Remover as constraints incorretas e recriar com a
-- combinação de colunas correta para unicidade de negócio.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. FREQUENCIAS
--    Antes: UNIQUE (turma_id)         → 1 frequência no banco inteiro por turma
--    Depois: UNIQUE (turma_id, aluno_id, data, tempo, disciplina)
-- ---------------------------------------------------------------
ALTER TABLE public.frequencias
  DROP CONSTRAINT IF EXISTS frequencias_uniqueness;

ALTER TABLE public.frequencias
  ADD CONSTRAINT frequencias_uniqueness
  UNIQUE (turma_id, aluno_id, data, tempo, disciplina);

-- ---------------------------------------------------------------
-- 2. NOTAS
--    Antes: UNIQUE (aluno_id)                    → 1 nota por aluno no banco inteiro
--    Depois: UNIQUE (avaliacao_id, aluno_id)     → 1 nota por avaliação por aluno
-- ---------------------------------------------------------------
ALTER TABLE public.notas
  DROP CONSTRAINT IF EXISTS notas_avaliacao_id_aluno_id_key;

ALTER TABLE public.notas
  ADD CONSTRAINT notas_avaliacao_id_aluno_id_key
  UNIQUE (avaliacao_id, aluno_id);

-- ---------------------------------------------------------------
-- 3. CONTEUDOS
--    Antes: UNIQUE (data)                                → 1 conteúdo por data no banco inteiro
--    Depois: UNIQUE (turma_id, data, tempo, disciplina)  → 1 conteúdo por turma+data+tempo+disciplina
-- ---------------------------------------------------------------
ALTER TABLE public.conteudos
  DROP CONSTRAINT IF EXISTS conteudos_uniqueness;

ALTER TABLE public.conteudos
  ADD CONSTRAINT conteudos_uniqueness
  UNIQUE (turma_id, data, tempo, disciplina);

-- ---------------------------------------------------------------
-- 4. FECHAMENTOS_BIMESTRES
--    Antes: UNIQUE (bimestre)                        → 1 fechamento por bimestre no banco inteiro
--    Depois: UNIQUE (turma_id, disciplina, bimestre) → 1 fechamento por turma+disciplina+bimestre
-- ---------------------------------------------------------------
ALTER TABLE public.fechamentos_bimestres
  DROP CONSTRAINT IF EXISTS unique_fechamento_turma_disciplina_bimestre;

ALTER TABLE public.fechamentos_bimestres
  ADD CONSTRAINT unique_fechamento_turma_disciplina_bimestre
  UNIQUE (turma_id, disciplina, bimestre);

-- ---------------------------------------------------------------
-- 5. PROFESSOR_ALOCACOES
--    Antes: UNIQUE (escola_id)                          → 1 professor por escola no banco inteiro
--    Depois: UNIQUE (professor_id, escola_id, turno)    → 1 alocação por professor+escola+turno
-- ---------------------------------------------------------------
ALTER TABLE public.professor_alocacoes
  DROP CONSTRAINT IF EXISTS professor_alocacoes_professor_id_escola_id_turno_key;

ALTER TABLE public.professor_alocacoes
  ADD CONSTRAINT professor_alocacoes_professor_id_escola_id_turno_key
  UNIQUE (professor_id, escola_id, turno);

-- ---------------------------------------------------------------
-- 6. PROFESSOR_HORARIOS
--    Antes: UNIQUE (tempo_ordem)                                  → 1 horário por tempo no banco inteiro
--    Depois: UNIQUE (professor_id, dia_semana, tempo_ordem)       → 1 horário por professor+dia+tempo
-- ---------------------------------------------------------------
ALTER TABLE public.professor_horarios
  DROP CONSTRAINT IF EXISTS professor_horarios_professor_id_dia_semana_tempo_ordem_key;

ALTER TABLE public.professor_horarios
  ADD CONSTRAINT professor_horarios_professor_id_dia_semana_tempo_ordem_key
  UNIQUE (professor_id, dia_semana, tempo_ordem);

-- ---------------------------------------------------------------
-- 7. VERIFICAÇÃO (opcional — confirma que as constraints foram aplicadas)
-- ---------------------------------------------------------------
DO $$
BEGIN
  -- Verifica que as constraints recriadas existem com as colunas corretas
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'frequencias'
      AND c.conname = 'frequencias_uniqueness'
      AND c.contype = 'u'
  ), 'frequencias_uniqueness constraint não encontrada';

  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'notas'
      AND c.conname = 'notas_avaliacao_id_aluno_id_key'
      AND c.contype = 'u'
  ), 'notas_avaliacao_id_aluno_id_key constraint não encontrada';

  RAISE NOTICE 'Todas as constraints UNIQUE foram corrigidas com sucesso.';
END $$;
