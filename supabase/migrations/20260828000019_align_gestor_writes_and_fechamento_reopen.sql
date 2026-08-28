-- =============================================================
-- DC Digital — Alinhamento de Permissões de Escrita do GESTOR e Reabertura de Bimestres (Issue 3)
-- Migration: 20260828000019_align_gestor_writes_and_fechamento_reopen.sql
-- =============================================================

-- 1. ALUNOS — Escrita alinhada com p_escola_permitida(escola_id)
DROP POLICY IF EXISTS "admin_insert_alunos" ON public.alunos;
CREATE POLICY "admin_insert_alunos" ON public.alunos
  FOR INSERT
  WITH CHECK (p_escola_permitida(alunos.escola_id));

DROP POLICY IF EXISTS "admin_update_alunos" ON public.alunos;
CREATE POLICY "admin_update_alunos" ON public.alunos
  FOR UPDATE
  USING (p_escola_permitida(alunos.escola_id))
  WITH CHECK (p_escola_permitida(alunos.escola_id));

DROP POLICY IF EXISTS "admin_delete_alunos" ON public.alunos;
CREATE POLICY "admin_delete_alunos" ON public.alunos
  FOR DELETE
  USING (p_escola_permitida(alunos.escola_id));

-- 2. TURMAS — Escrita alinhada com p_escola_permitida(escola_id)
DROP POLICY IF EXISTS "admin_insert_turmas" ON public.turmas;
CREATE POLICY "admin_insert_turmas" ON public.turmas
  FOR INSERT
  WITH CHECK (p_escola_permitida(turmas.escola_id));

DROP POLICY IF EXISTS "admin_update_turmas" ON public.turmas;
CREATE POLICY "admin_update_turmas" ON public.turmas
  FOR UPDATE
  USING (p_escola_permitida(turmas.escola_id))
  WITH CHECK (p_escola_permitida(turmas.escola_id));

DROP POLICY IF EXISTS "admin_delete_turmas" ON public.turmas;
CREATE POLICY "admin_delete_turmas" ON public.turmas
  FOR DELETE
  USING (p_escola_permitida(turmas.escola_id));

-- 3. PROFESSOR_ALOCACOES — Escrita alinhada com p_escola_permitida(escola_id)
DROP POLICY IF EXISTS "admin_insert_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "admin_insert_professor_alocacoes" ON public.professor_alocacoes
  FOR INSERT
  WITH CHECK (p_escola_permitida(professor_alocacoes.escola_id));

DROP POLICY IF EXISTS "admin_update_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "admin_update_professor_alocacoes" ON public.professor_alocacoes
  FOR UPDATE
  USING (p_escola_permitida(professor_alocacoes.escola_id))
  WITH CHECK (p_escola_permitida(professor_alocacoes.escola_id));

DROP POLICY IF EXISTS "admin_delete_professor_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "admin_delete_professor_alocacoes" ON public.professor_alocacoes
  FOR DELETE
  USING (p_escola_permitida(professor_alocacoes.escola_id));

-- 4. PROFESSOR_HORARIOS — Escrita alinhada com p_escola_permitida(escola_id)
DROP POLICY IF EXISTS "admin_insert_professor_horarios" ON public.professor_horarios;
CREATE POLICY "admin_insert_professor_horarios" ON public.professor_horarios
  FOR INSERT
  WITH CHECK (p_escola_permitida(professor_horarios.escola_id));

DROP POLICY IF EXISTS "admin_update_professor_horarios" ON public.professor_horarios;
CREATE POLICY "admin_update_professor_horarios" ON public.professor_horarios
  FOR UPDATE
  USING (p_escola_permitida(professor_horarios.escola_id))
  WITH CHECK (p_escola_permitida(professor_horarios.escola_id));

DROP POLICY IF EXISTS "admin_delete_professor_horarios" ON public.professor_horarios;
CREATE POLICY "admin_delete_professor_horarios" ON public.professor_horarios
  FOR DELETE
  USING (p_escola_permitida(professor_horarios.escola_id));

-- 5. FECHAMENTOS_BIMESTRES — Reabertura de bimestre (DELETE) para ADMIN, GESTOR e SECRETARIO via p_acesso_por_turma
DROP POLICY IF EXISTS "admin_delete_fechamentos" ON public.fechamentos_bimestres;
DROP POLICY IF EXISTS "staff_delete_fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "staff_delete_fechamentos" ON public.fechamentos_bimestres
  FOR DELETE
  USING (
    (SELECT get_user_role()) = 'ADMIN'
    OR p_acesso_por_turma(fechamentos_bimestres.turma_id)
  );
