-- Auditoria de exposição: visitante sem login deixa de herdar policy e GRANT.
-- CPF de aluno sai da leitura direta da tabela.
-- Falha de login anônima deixa de poder chamar a função.
-- Pedido LGPD ganha limite durável por hash de IP.
-- Calendário e feriados continuam legíveis por qualquer autenticado.

-- -------------------------------------------------------------
-- 1. Policies da API passam a valer só para quem entrou
-- -------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I TO authenticated',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END $$;

-- -------------------------------------------------------------
-- 2. Visitante não recebe privilégio de tabela, sequência ou a função de login
-- -------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', r.tablename);
  END LOOP;

  FOR r IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM PUBLIC, anon', r.sequence_name);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.log_login_failure(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_login_failure(text, text) TO authenticated, service_role;

-- -------------------------------------------------------------
-- 3. CPF do aluno não sai no SELECT da tabela
--    Quem precisa lê pela função. Professor da chamada não entra.
-- -------------------------------------------------------------
REVOKE SELECT, UPDATE ON TABLE public.alunos FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, escola_id, turma_id, nome, data_nascimento, sexo, nome_responsavel,
  telefone, endereco, status, criado_em, matricula, usuario_id
) ON TABLE public.alunos TO authenticated;
GRANT UPDATE (
  escola_id, turma_id, nome, data_nascimento, sexo, nome_responsavel,
  telefone, endereco, status, matricula, usuario_id
) ON TABLE public.alunos TO authenticated;

CREATE OR REPLACE FUNCTION public.cpfs_de_alunos(p_ids uuid[])
RETURNS TABLE (id uuid, cpf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.cpf
  FROM public.alunos a
  WHERE coalesce(array_length(p_ids, 1), 0) <= 1000
    AND a.id = ANY(coalesce(p_ids, ARRAY[]::uuid[]))
    AND (
      (SELECT public.get_user_role()) = 'ADMIN'
      OR public.usuario_tem_escopo_rede()
      OR (SELECT public.get_user_role()) = 'GESTOR_SEMEC'
      OR (
        (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
        AND a.escola_id IS NOT NULL
        AND a.escola_id = public.get_user_escola_id()
      )
      OR public.aluno_e_o_proprio(a.id)
    );
$$;

CREATE OR REPLACE FUNCTION public.definir_cpf_aluno(p_id uuid, p_cpf text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_escola uuid;
  v_role text := coalesce(public.get_user_role(), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  SELECT escola_id INTO v_escola
  FROM public.alunos
  WHERE id = p_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aluno não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    v_role = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR v_role = 'GESTOR_SEMEC'
    OR (
      v_role IN ('GESTOR', 'SECRETARIO')
      AND v_escola IS NOT NULL
      AND v_escola = public.get_user_escola_id()
    )
  ) THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  UPDATE public.alunos
  SET cpf = NULLIF(btrim(p_cpf), '')
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.alunos_ids_por_cpf(p_cpfs text[])
RETURNS TABLE (id uuid, cpf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.cpf
  FROM public.alunos a
  WHERE coalesce(array_length(p_cpfs, 1), 0) BETWEEN 1 AND 500
    AND a.cpf IS NOT NULL
    AND regexp_replace(a.cpf, '\D', '', 'g') IN (
      SELECT regexp_replace(x, '\D', '', 'g')
      FROM unnest(p_cpfs) AS x
      WHERE regexp_replace(x, '\D', '', 'g') ~ '^[0-9]{11}$'
    )
    AND (
      (SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR_SEMEC')
      OR public.usuario_tem_escopo_rede()
      OR (
        (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
        AND a.escola_id IS NOT NULL
        AND a.escola_id = public.get_user_escola_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.aluno_da_sessao()
RETURNS TABLE (id uuid, cpf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a.id, a.cpf
  FROM public.alunos a
  WHERE public.aluno_e_o_proprio(a.id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.cpfs_de_alunos(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_cpf_aluno(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.alunos_ids_por_cpf(text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.aluno_da_sessao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cpfs_de_alunos(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_cpf_aluno(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alunos_ids_por_cpf(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aluno_da_sessao() TO authenticated;

-- -------------------------------------------------------------
-- 4. Limite durável do formulário LGPD, por hash de IP
-- -------------------------------------------------------------
ALTER TABLE public.lgpd_requests
  ADD COLUMN IF NOT EXISTS ip_hash text;

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_ip_hash_created_at
  ON public.lgpd_requests (ip_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_lgpd_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recent_email integer;
  recent_ip integer;
  window_start timestamptz := now() - interval '15 minutes';
BEGIN
  NEW.email := lower(trim(NEW.email));

  SELECT count(*) INTO recent_email
  FROM public.lgpd_requests
  WHERE email = NEW.email
    AND created_at >= window_start;

  IF recent_email >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED'
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.ip_hash IS NOT NULL AND length(trim(NEW.ip_hash)) > 0 THEN
    SELECT count(*) INTO recent_ip
    FROM public.lgpd_requests
    WHERE ip_hash = NEW.ip_hash
      AND created_at >= window_start;

    IF recent_ip >= 5 THEN
      RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_lgpd_rate_limit() FROM PUBLIC, anon, authenticated;
