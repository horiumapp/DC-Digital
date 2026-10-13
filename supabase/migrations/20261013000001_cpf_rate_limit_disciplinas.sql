-- CPF do professor só sai para ADMIN e para o próprio docente.
-- A criação de contas passa a ter limite durável, no mesmo ritmo da função administrativa.
-- A turma devolve os nomes dos componentes sem abrir a ficha dos colegas.
-- A migration anterior, aplicada no editor, entra no histórico se a tabela existir.

DO $$
BEGIN
  IF to_regclass('supabase_migrations.schema_migrations') IS NULL THEN
    RETURN;
  END IF;
  BEGIN
    INSERT INTO supabase_migrations.schema_migrations (version, name)
    VALUES ('20261013000000', 'restrict_docente_reads_and_professor_insert')
    ON CONFLICT (version) DO NOTHING;
  EXCEPTION WHEN undefined_column THEN
    INSERT INTO supabase_migrations.schema_migrations (version)
    VALUES ('20261013000000')
    ON CONFLICT (version) DO NOTHING;
  END;
END $$;

REVOKE SELECT, UPDATE ON TABLE public.professores FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, nome, email, telefone, vinculo, status, criado_em, departamento, disciplinas, usuario_id
) ON TABLE public.professores TO authenticated;
GRANT UPDATE (
  nome, email, telefone, vinculo, status, departamento, disciplinas, usuario_id
) ON TABLE public.professores TO authenticated;

CREATE OR REPLACE FUNCTION public.cpfs_de_professores(p_ids uuid[])
RETURNS TABLE (id uuid, cpf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id, p.cpf
  FROM public.professores p
  WHERE p.id = ANY(coalesce(p_ids, ARRAY[]::uuid[]))
    AND (
      (SELECT public.get_user_role()) = 'ADMIN'
      OR public.professor_e_o_proprio(p.id)
    );
$$;

CREATE OR REPLACE FUNCTION public.definir_cpf_professor(p_id uuid, p_cpf text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT public.get_user_role()) IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  UPDATE public.professores
  SET cpf = NULLIF(btrim(p_cpf), '')
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cpfs_de_professores(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_cpf_professor(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cpfs_de_professores(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_cpf_professor(uuid, text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.account_creation_rate (
  user_id uuid PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.account_creation_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_creation_rate FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reservar_criacao_de_conta(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.account_creation_rate (user_id, window_start, request_count)
  VALUES (p_user_id, now(), 1)
  ON CONFLICT (user_id) DO UPDATE
  SET
    window_start = CASE
      WHEN public.account_creation_rate.window_start < now() - interval '60 seconds' THEN now()
      ELSE public.account_creation_rate.window_start
    END,
    request_count = CASE
      WHEN public.account_creation_rate.window_start < now() - interval '60 seconds' THEN 1
      ELSE public.account_creation_rate.request_count + 1
    END
  RETURNING request_count INTO v_count;

  RETURN v_count <= 10;
END;
$$;

REVOKE ALL ON FUNCTION public.reservar_criacao_de_conta(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reservar_criacao_de_conta(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.disciplinas_da_turma(p_turma_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(array_agg(componente ORDER BY componente), ARRAY[]::text[])
  FROM (
    SELECT DISTINCT btrim(h.componente) AS componente
    FROM public.professor_horarios h
    WHERE h.turma_id = p_turma_id
      AND public.p_acesso_por_turma(p_turma_id)
      AND btrim(coalesce(h.componente, '')) <> ''
      AND upper(btrim(h.componente)) <> 'GERAL'
  ) componentes;
$$;

REVOKE ALL ON FUNCTION public.disciplinas_da_turma(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disciplinas_da_turma(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_public_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cargo text := upper(btrim(coalesce(NEW.raw_app_meta_data->>'role', '')));
BEGIN
  IF coalesce(NEW.raw_user_meta_data->>'role', '') <> ''
     OR coalesce(NEW.raw_user_meta_data->>'cargo', '') <> '' THEN
    RAISE EXCEPTION 'Cadastro público desativado' USING ERRCODE = '42501';
  END IF;
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_nome text;
  v_cpf text;
  v_telefone text;
  v_vinculo text;
  v_cargo text;
BEGIN
  v_nome := coalesce(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_cpf := coalesce(NEW.raw_user_meta_data->>'cpf', '');
  v_telefone := coalesce(NEW.raw_user_meta_data->>'telefone', '');
  v_vinculo := coalesce(NEW.raw_user_meta_data->>'vinculo', 'A Definir');
  v_cargo := upper(btrim(coalesce(NEW.raw_app_meta_data->>'role', 'PENDENTE')));
  IF v_cargo NOT IN (
    'ADMIN', 'GESTOR', 'GESTOR_SEMEC', 'SECRETARIO', 'PROFESSOR', 'ALUNO', 'PENDENTE', 'REVOGADO'
  ) THEN
    v_cargo := 'PENDENTE';
  END IF;

  INSERT INTO public.usuarios (id, email, nome_completo, cargo)
  VALUES (NEW.id, NEW.email, v_nome, v_cargo)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      nome_completo = EXCLUDED.nome_completo,
      cargo = EXCLUDED.cargo;

  IF v_cargo = 'PROFESSOR' THEN
    INSERT INTO public.professores (nome, email, cpf, telefone, vinculo, status)
    VALUES (v_nome, NEW.email, NULLIF(v_cpf, ''), v_telefone, v_vinculo, 'Inativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
