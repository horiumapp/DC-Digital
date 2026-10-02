-- ============================================================
-- Migration: 20261002000001_restore_professor_aluno_p_acesso_por_turma.sql
-- Objetivo: Restaurar a verificação de PROFESSOR e ALUNO em p_acesso_por_turma,
--           mantendo o isolamento multi-tenant de GESTOR e SECRETARIO.
-- ============================================================

CREATE OR REPLACE FUNCTION public.p_acesso_por_turma(p_turma_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      (SELECT public.get_user_role()) = 'GESTOR'
      AND (
        public.get_user_escola_id() IS NULL
        OR EXISTS (
          SELECT 1 FROM public.turmas t
          WHERE t.id = p_turma_id AND t.escola_id = public.get_user_escola_id()
        )
      )
    )
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = p_turma_id AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma(p_turma_id)
    OR public.aluno_tem_acesso_a_turma(p_turma_id);
$function$;

GRANT EXECUTE ON FUNCTION public.p_acesso_por_turma(uuid) TO authenticated;
