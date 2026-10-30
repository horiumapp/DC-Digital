-- Modernização DC Digital — Fase 3: hardening de segurança
-- S1 reject_public_signup fail-closed
-- S2 turmas SELECT sem OR amplo por escola_id
-- S3 currículo ADMIN-only (alinha UI /curriculo)
-- S4 user_consents INSERT exige user_id = auth.uid()
-- S5 revoke UPDATE de usuario_id/email em professores

-- -------------------------------------------------------------
-- S1: Cadastro público fail-closed (reverte atalho cargo = '')
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_public_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  cargo text := upper(btrim(coalesce(NEW.raw_app_meta_data->>'role', '')));
BEGIN
  -- Impede auto-atribuição de papel via user_metadata
  IF coalesce(NEW.raw_user_meta_data->>'role', '') <> ''
     OR coalesce(NEW.raw_user_meta_data->>'cargo', '') <> '' THEN
    RAISE EXCEPTION 'Cadastro público desativado' USING ERRCODE = '42501';
  END IF;

  -- Fail-closed: cargo vazio ou desconhecido bloqueia (admin createUser define app_metadata.role)
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

-- -------------------------------------------------------------
-- S2: turmas — remover OR escola_id = get_user_escola_id()
-- Mantém rede/staff (p_escola_permitida), professor na turma e aluno na turma.
-- professor_select_turmas_da_lotacao permanece para listagem por lotação.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "auth_select_turmas" ON public.turmas;
CREATE POLICY "auth_select_turmas" ON public.turmas
  FOR SELECT
  USING (
    public.p_escola_permitida(turmas.escola_id)
    OR public.professor_tem_acesso_a_turma(turmas.id)
    OR public.aluno_tem_acesso_a_turma(turmas.id)
  );

-- -------------------------------------------------------------
-- S3: Currículo — apenas ADMIN (UI já restringe a ADMIN)
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Admin gerencia curriculo_unidades" ON public.curriculo_unidades;
CREATE POLICY "Admin gerencia curriculo_unidades" ON public.curriculo_unidades
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = 'ADMIN'
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "Admin gerencia curriculo_objetos" ON public.curriculo_objetos;
CREATE POLICY "Admin gerencia curriculo_objetos" ON public.curriculo_objetos
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = 'ADMIN'
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = 'ADMIN'
  );

DROP POLICY IF EXISTS "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades;
CREATE POLICY "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = 'ADMIN'
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = 'ADMIN'
  );

CREATE OR REPLACE FUNCTION public.replace_curriculo_objetos(
  p_unidade_id uuid,
  p_objetos text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_desc text;
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Permissão negada para editar currículo' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.curriculo_objetos WHERE unidade_id = p_unidade_id;

  IF p_objetos IS NOT NULL THEN
    FOREACH v_desc IN ARRAY p_objetos
    LOOP
      IF trim(v_desc) <> '' THEN
        INSERT INTO public.curriculo_objetos (unidade_id, descricao)
        VALUES (p_unidade_id, trim(v_desc));
      END IF;
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_curriculo_unidade_com_objetos(
  p_unidade_id uuid,
  p_modalidade text,
  p_ano text,
  p_disciplina text,
  p_bimestre text,
  p_nome text,
  p_objetos text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(public.get_user_role(), '');
  v_desc text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF v_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Permissão negada para editar currículo' USING ERRCODE = '42501';
  END IF;

  UPDATE public.curriculo_unidades
  SET modalidade = p_modalidade,
      ano = p_ano,
      disciplina = p_disciplina,
      bimestre = p_bimestre,
      nome = coalesce(nullif(trim(p_nome), ''), 'Conteúdo Ministrado')
  WHERE id = p_unidade_id;

  DELETE FROM public.curriculo_objetos WHERE unidade_id = p_unidade_id;

  IF p_objetos IS NOT NULL THEN
    FOREACH v_desc IN ARRAY p_objetos
    LOOP
      IF trim(v_desc) <> '' THEN
        INSERT INTO public.curriculo_objetos (unidade_id, descricao)
        VALUES (p_unidade_id, trim(v_desc));
      END IF;
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_curriculo_unidade(p_unidade_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(public.get_user_role(), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF v_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Permissão negada para remover currículo' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.curriculo_habilidades WHERE unidade_id = p_unidade_id;
  DELETE FROM public.curriculo_objetos WHERE unidade_id = p_unidade_id;
  DELETE FROM public.curriculo_unidades WHERE id = p_unidade_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.import_curriculo_batch(
  p_items jsonb,
  p_substituir boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := coalesce(public.get_user_role(), '');
  v_elem jsonb;
  v_unidade_id uuid;
  v_desc text;
  v_count integer := 0;
  v_old_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF v_role IS DISTINCT FROM 'ADMIN' THEN
    RAISE EXCEPTION 'Permissão negada para importar currículo' USING ERRCODE = '42501';
  END IF;

  IF p_substituir THEN
    SELECT array_agg(DISTINCT u.id) INTO v_old_ids
    FROM public.curriculo_unidades u
    JOIN jsonb_array_elements(p_items) item ON
      u.modalidade = item->>'modalidade' AND
      u.ano = item->>'ano' AND
      u.disciplina = item->>'disciplina' AND
      u.bimestre = item->>'bimestre';

    IF v_old_ids IS NOT NULL AND array_length(v_old_ids, 1) > 0 THEN
      DELETE FROM public.curriculo_habilidades WHERE unidade_id = ANY(v_old_ids);
      DELETE FROM public.curriculo_objetos WHERE unidade_id = ANY(v_old_ids);
      DELETE FROM public.curriculo_unidades WHERE id = ANY(v_old_ids);
    END IF;
  END IF;

  FOR v_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
    VALUES (
      v_elem->>'modalidade',
      v_elem->>'ano',
      v_elem->>'disciplina',
      v_elem->>'bimestre',
      coalesce(nullif(trim(v_elem->>'nome'), ''), 'Conteúdo Ministrado')
    )
    RETURNING id INTO v_unidade_id;

    IF v_elem ? 'objetos' AND jsonb_typeof(v_elem->'objetos') = 'array' THEN
      FOR v_desc IN SELECT jsonb_array_elements_text(v_elem->'objetos')
      LOOP
        IF trim(v_desc) <> '' THEN
          INSERT INTO public.curriculo_objetos (unidade_id, descricao)
          VALUES (v_unidade_id, trim(v_desc));
        END IF;
      END LOOP;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_curriculo_objetos(uuid, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_curriculo_objetos(uuid, text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_curriculo_unidade(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_curriculo_unidade(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.import_curriculo_batch(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_curriculo_batch(jsonb, boolean) TO authenticated;

-- -------------------------------------------------------------
-- S4: Consentimentos — user_id obrigatório e igual ao autenticado
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_user_consents" ON public.user_consents;
DROP POLICY IF EXISTS "Allow insert for user_consents" ON public.user_consents;
DROP POLICY IF EXISTS "Allow public insert for user_consents" ON public.user_consents;
CREATE POLICY "auth_insert_user_consents" ON public.user_consents
  FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND user_id = auth.uid()
  );

-- -------------------------------------------------------------
-- S5: Defense-in-depth — não permitir UPDATE de identidade via PostgREST
-- Trigger guard_professor_identity permanece como segunda linha.
-- -------------------------------------------------------------
REVOKE UPDATE ON TABLE public.professores FROM PUBLIC, anon, authenticated;
GRANT UPDATE (
  nome, telefone, vinculo, status, departamento, disciplinas
) ON TABLE public.professores TO authenticated;
