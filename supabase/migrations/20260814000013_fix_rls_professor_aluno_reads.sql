-- =============================================================
-- DC Digital — Fix RLS: Restaura Leitura para Professores e Alunos
-- Migration: 20260814000013_fix_rls_professor_aluno_reads.sql
-- =============================================================
--
-- PROBLEMA: A migration 20260813000011_fix_rls_privilege_escalation.sql
--   restringiu as políticas de SELECT em turmas, avaliacoes, conteudos,
--   frequencias, fechamentos_bimestres e notas apenas a ADMIN/GESTOR/SECRETARIO
--   e a usuários cujo usuarios.escola_id coincidisse com a turma.
--   Isso impedia professores (cujo usuarios.escola_id pode ser NULL ou
--   que lecionam em múltiplas escolas) e alunos de consultarem suas
--   próprias turmas, notas, faltas e avaliações.
--
-- SOLUÇÃO:
--   1. Criar helpers para validar acesso legítimo de alunos (aluno_tem_acesso_a_turma
--      e aluno_e_o_proprio).
--   2. Atualizar p_acesso_por_turma para incluir professor_tem_acesso_a_turma
--      e aluno_tem_acesso_a_turma.
--   3. Atualizar as políticas de SELECT garantindo que:
--      - Professores leiam turmas, avaliações, notas, frequências e conteúdos
--        onde lecionam (via professor_horarios).
--      - Alunos leiam sua própria turma, avaliações e conteúdos da sua turma,
--        e estritamente suas próprias notas e faltas.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. HELPERS DE ACESSO
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aluno_tem_acesso_a_turma(p_turma_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT (
    (SELECT public.get_user_role()) = 'ALUNO'
    AND EXISTS (
      SELECT 1
      FROM public.alunos a
      WHERE
        a.turma_id = p_turma_id
        AND (
          (a.usuario_id IS NOT NULL AND a.usuario_id = auth.uid())
          OR (a.id = auth.uid())
          OR (
            a.cpf IS NOT NULL AND (
              replace(a.cpf, '.', '') = replace(coalesce(auth.jwt() -> 'user_metadata' ->> 'cpf', ''), '.', '')
              OR (
                auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
                AND replace(a.cpf, '.', '') = split_part(auth.jwt() ->> 'email', '@', 1)
              )
            )
          )
        )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.aluno_e_o_proprio(p_aluno_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT (
    (SELECT public.get_user_role()) = 'ALUNO'
    AND EXISTS (
      SELECT 1
      FROM public.alunos a
      WHERE
        a.id = p_aluno_id
        AND (
          (a.usuario_id IS NOT NULL AND a.usuario_id = auth.uid())
          OR (a.id = auth.uid())
          OR (
            a.cpf IS NOT NULL AND (
              replace(a.cpf, '.', '') = replace(coalesce(auth.jwt() -> 'user_metadata' ->> 'cpf', ''), '.', '')
              OR (
                auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
                AND replace(a.cpf, '.', '') = split_part(auth.jwt() ->> 'email', '@', 1)
              )
            )
          )
        )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.p_acesso_por_turma(p_turma_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR')
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = p_turma_id AND t.escola_id = get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma(p_turma_id)
    OR public.aluno_tem_acesso_a_turma(p_turma_id);
$function$;

GRANT EXECUTE ON FUNCTION public.aluno_tem_acesso_a_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aluno_e_o_proprio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.p_acesso_por_turma(uuid) TO authenticated;

-- ---------------------------------------------------------------
-- 2. ATUALIZAÇÃO DAS POLÍTICAS DE SELECT
-- ---------------------------------------------------------------

-- turmas
DROP POLICY IF EXISTS "auth_select_turmas" ON public.turmas;
CREATE POLICY "auth_select_turmas" ON public.turmas
  FOR SELECT
  USING (
    p_escola_permitida(turmas.escola_id)
    OR turmas.escola_id = get_user_escola_id()
    OR professor_tem_acesso_a_turma(turmas.id)
    OR aluno_tem_acesso_a_turma(turmas.id)
  );

-- avaliacoes
DROP POLICY IF EXISTS "auth_select_avaliacoes" ON public.avaliacoes;
CREATE POLICY "auth_select_avaliacoes" ON public.avaliacoes
  FOR SELECT
  USING (
    p_acesso_por_turma(avaliacoes.turma_id)
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = avaliacoes.turma_id AND t.escola_id = get_user_escola_id()
    )
  );

-- conteudos
DROP POLICY IF EXISTS "auth_select_conteudos" ON public.conteudos;
CREATE POLICY "auth_select_conteudos" ON public.conteudos
  FOR SELECT
  USING (
    p_acesso_por_turma(conteudos.turma_id)
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = conteudos.turma_id AND t.escola_id = get_user_escola_id()
    )
  );

-- frequencias
DROP POLICY IF EXISTS "auth_select_frequencias" ON public.frequencias;
CREATE POLICY "auth_select_frequencias" ON public.frequencias
  FOR SELECT
  USING (
    (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR (
      (SELECT get_user_role()) = 'SECRETARIO'
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencias.turma_id AND t.escola_id = get_user_escola_id()
      )
    )
    OR professor_tem_acesso_a_turma(frequencias.turma_id)
    OR aluno_e_o_proprio(frequencias.aluno_id)
  );

-- fechamentos_bimestres
DROP POLICY IF EXISTS "Qualquer autenticado pode ver fechamentos" ON public.fechamentos_bimestres;
CREATE POLICY "Qualquer autenticado pode ver fechamentos" ON public.fechamentos_bimestres
  FOR SELECT
  USING (
    p_acesso_por_turma(fechamentos_bimestres.turma_id)
    OR EXISTS (
      SELECT 1 FROM public.turmas t
      WHERE t.id = fechamentos_bimestres.turma_id AND t.escola_id = get_user_escola_id()
    )
  );

-- notas
DROP POLICY IF EXISTS "auth_select_notas" ON public.notas;
CREATE POLICY "auth_select_notas" ON public.notas
  FOR SELECT
  USING (
    (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR (
      (SELECT get_user_role()) = 'SECRETARIO'
      AND EXISTS (
        SELECT 1
        FROM public.avaliacoes av JOIN public.turmas t ON av.turma_id = t.id
        WHERE av.id = notas.avaliacao_id AND t.escola_id = get_user_escola_id()
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id AND professor_tem_acesso_a_turma(av.turma_id)
    )
    OR aluno_e_o_proprio(notas.aluno_id)
  );
