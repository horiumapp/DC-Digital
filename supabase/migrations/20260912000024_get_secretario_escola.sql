-- =============================================================
-- DC Digital — Fix: Permite obter Secretário(a) e Diretor(a) da Escola para Boletim
-- Migration: 20260912000024_get_secretario_escola.sql
-- =============================================================
--
-- MOTIVO:
--   O Boletim Escolar necessita exibir o nome do(a) Secretário(a) e
--   do(a) Diretor(a) alocados na escola.
--   Para conformidade com LGPD e princípio de menor privilégio,
--   funções SECURITY DEFINER expõem estritamente os nomes completos
--   para documentos oficiais, sem expor e-mails pessoais ou metadados de contas.
-- =============================================================

-- 1. Helper para obter o nome do(a) Secretário(a) da escola
CREATE OR REPLACE FUNCTION public.get_secretario_escola(p_escola_id uuid)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT nome_completo
  FROM public.usuarios
  WHERE escola_id = p_escola_id
    AND cargo = 'SECRETARIO'
  ORDER BY criado_em ASC
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_secretario_escola(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_secretario_escola(uuid) TO anon;

-- 2. Helper para obter o nome do(a) Diretor(a) / Gestor(a) da escola
CREATE OR REPLACE FUNCTION public.get_diretor_escola(p_escola_id uuid)
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT NULLIF(trim(diretor), '') FROM public.escolas WHERE id = p_escola_id),
    (SELECT nome_completo FROM public.usuarios WHERE escola_id = p_escola_id AND cargo = 'GESTOR' ORDER BY criado_em ASC LIMIT 1)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.get_diretor_escola(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_diretor_escola(uuid) TO anon;

-- 3. Atualização de política de leitura em public.usuarios
--    Garante que membros autenticados da escola possam ler a equipe diretiva (GESTOR/SECRETARIO)
DROP POLICY IF EXISTS "auth_select_usuarios" ON public.usuarios;
CREATE POLICY "auth_select_usuarios" ON public.usuarios
  FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT get_user_role()) IN ('ADMIN', 'GESTOR')
    OR (
      (SELECT get_user_role()) = 'SECRETARIO'
      AND escola_id = get_user_escola_id()
    )
    OR (
      cargo IN ('GESTOR', 'SECRETARIO')
      AND (
        escola_id = get_user_escola_id()
        OR escola_id IN (
          SELECT a.escola_id FROM public.alunos a WHERE a.usuario_id = auth.uid() OR a.id = auth.uid()
        )
      )
    )
  );
