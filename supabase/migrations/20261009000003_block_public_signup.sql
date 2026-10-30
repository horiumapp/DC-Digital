-- Conta nova só entra se a criação administrativa já gravou um cargo.
-- O cadastro público do Auth não consegue definir app_metadata.role.

CREATE OR REPLACE FUNCTION public.reject_public_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cargo text := upper(btrim(coalesce(NEW.raw_app_meta_data->>'role', '')));
BEGIN
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

DROP TRIGGER IF EXISTS reject_public_signup ON auth.users;
CREATE TRIGGER reject_public_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_public_signup();
