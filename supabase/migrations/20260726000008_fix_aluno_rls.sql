-- =============================================================
-- DC Digital -- Correção de RLS da tabela Alunos e Portal do Aluno
-- Migration: 20260726000008_fix_aluno_rls.sql
-- =============================================================

-- 1. Adicionar usuario_id à tabela alunos para relacionamento com auth.users
ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_alunos_usuario_id
  ON public.alunos (usuario_id);

-- 2. Atualizar a política auth_select_alunos para conceder acesso ao Portal do Aluno
DROP POLICY IF EXISTS "auth_select_alunos" ON public.alunos;
CREATE POLICY "auth_select_alunos" ON public.alunos
  FOR SELECT
  USING (
    -- ADMIN e equipe administrativa veem tudo na sua escola
    is_admin_or_staff()
    OR
    -- PROFESSOR: apenas alunos de turmas em que ele leciona
    (
      (SELECT get_user_role()) = 'PROFESSOR'
      AND EXISTS (
        SELECT 1
        FROM professor_horarios ph
        JOIN professores p ON ph.professor_id = p.id
        WHERE
          ph.turma_id = alunos.turma_id
          AND (
            (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
            OR (p.usuario_id IS NULL AND p.email = (auth.jwt() ->> 'email'))
          )
      )
    )
    OR
    -- Portal do aluno: aluno vê seus próprios dados via usuario_id ou correspondência de CPF/Email
    (
      (SELECT get_user_role()) = 'ALUNO'
      AND (
        (usuario_id IS NOT NULL AND usuario_id = auth.uid())
        OR (
          id = auth.uid()
        )
        OR (
          cpf IS NOT NULL AND (
            replace(cpf, '.', '') = replace(coalesce(auth.jwt() -> 'user_metadata' ->> 'cpf', ''), '.', '')
            OR (
              auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
              AND replace(cpf, '.', '') = split_part(auth.jwt() ->> 'email', '@', 1)
            )
          )
        )
      )
    )
  );
