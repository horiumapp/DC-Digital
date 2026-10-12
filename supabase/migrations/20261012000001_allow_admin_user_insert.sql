-- O Auth grava app_metadata.role só depois do INSERT em auth.users.
-- O gatilho anterior rejeitava esse INSERT porque o cargo ainda vinha vazio,
-- e o cadastro administrativo falhava com "Database error creating new user".
-- Cargo ausente segue como PENDENTE em handle_new_user.
-- Um cargo explícito fora da lista continua bloqueado.

CREATE OR REPLACE FUNCTION public.reject_public_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cargo text := upper(btrim(coalesce(NEW.raw_app_meta_data->>'role', '')));
BEGIN
  IF cargo = '' THEN
    RETURN NEW;
  END IF;
  IF cargo NOT IN (
    'ADMIN', 'GESTOR', 'GESTOR_SEMEC', 'SECRETARIO', 'PROFESSOR', 'ALUNO', 'PENDENTE', 'REVOGADO'
  ) THEN
    RAISE EXCEPTION 'Cadastro público desativado' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.reject_public_signup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_public_signup() TO supabase_auth_admin;
