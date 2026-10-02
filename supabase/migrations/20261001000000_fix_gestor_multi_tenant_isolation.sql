-- =============================================================
-- DC Digital — Correção de Isolamento Multi-Tenant para GESTOR e SECRETÁRIO
-- Migration: 20261001000000_fix_gestor_multi_tenant_isolation.sql
-- =============================================================

-- 1. Escola que o usuário logado pode LER/ADMINISTRAR.
-- ADMIN: visão sistêmica da rede municipal.
-- GESTOR sem escola_id (Gestor da Rede/SME): visão sistêmica.
-- GESTOR com escola_id (Diretor de Escola): restrito à sua própria escola.
-- SECRETARIO: restrito à sua própria escola.
CREATE OR REPLACE FUNCTION public.p_escola_permitida(p_escola_id uuid)
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
        OR p_escola_id = public.get_user_escola_id()
      )
    )
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND p_escola_id = public.get_user_escola_id()
    );
$function$;

-- 2. Acesso a dados vinculados a uma turma (frequências, notas, fechamentos, etc.).
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
    );
$function$;

GRANT EXECUTE ON FUNCTION public.p_escola_permitida(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.p_acesso_por_turma(uuid) TO authenticated;
