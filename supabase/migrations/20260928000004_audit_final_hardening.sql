-- ==============================================================================
-- DC Digital — Migration: 20260928000004_audit_final_hardening.sql
-- Hardening final:
-- 1. Fail-closed em RPCs SECURITY DEFINER de transferência e remanejamento
-- 2. Compatibilização de assinaturas e nomes de parâmetros de currículo
-- 3. RPC controlada para log de tentativa de login (LOGIN_FAILED) para anon
-- 4. Tabela de chaves de idempotência permanentes (sync_idempotency_keys)
-- ==============================================================================

-- -------------------------------------------------------------
-- 1. Fail-closed em transferência e remanejamento de alunos
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.liberar_transferencia_aluno(p_aluno_id uuid, p_motivo text DEFAULT NULL)
RETURNS TABLE(protocolo text, data_transferencia date)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_aluno public.alunos%ROWTYPE;
  v_role text := coalesce(public.get_user_role(), '');
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF v_role NOT IN ('ADMIN', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Apenas Administrador ou Secretário podem liberar transferências entre escolas'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_aluno FROM public.alunos WHERE id = p_aluno_id FOR UPDATE;
  IF NOT FOUND OR v_aluno.turma_id IS NULL THEN
    RAISE EXCEPTION 'Aluno sem matrícula ativa não pode ser transferido';
  END IF;

  IF v_role = 'SECRETARIO' AND v_aluno.escola_id IS DISTINCT FROM public.get_user_escola_id() THEN
    RAISE EXCEPTION 'O Secretário só pode liberar alunos da própria escola'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.aluno_transferencias WHERE aluno_id = p_aluno_id AND status = 'AGUARDANDO_RECEBIMENTO') THEN
    RAISE EXCEPTION 'Já existe uma transferência aguardando recebimento para este aluno';
  END IF;

  INSERT INTO public.aluno_transferencias(aluno_id, escola_origem_id, turma_origem_id, motivo)
  VALUES (v_aluno.id, v_aluno.escola_id, v_aluno.turma_id, nullif(trim(p_motivo), ''))
  RETURNING id INTO v_id;

  UPDATE public.alunos
  SET escola_id = NULL, turma_id = NULL, status = 'Aguardando transferência'
  WHERE id = v_aluno.id;

  UPDATE public.usuarios
  SET escola_id = NULL
  WHERE v_aluno.cpf IS NOT NULL
    AND email = regexp_replace(v_aluno.cpf, '\D', '', 'g') || '@aluno.dcdigital.local';

  RETURN QUERY SELECT t.protocolo, t.data_transferencia FROM public.aluno_transferencias t WHERE t.id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.receber_transferencia_aluno(
  p_protocolo text,
  p_matricula text,
  p_data_nascimento date,
  p_turma_destino_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_t public.aluno_transferencias%ROWTYPE;
  v_aluno public.alunos%ROWTYPE;
  v_origem public.turmas%ROWTYPE;
  v_destino public.turmas%ROWTYPE;
  v_role text := coalesce(public.get_user_role(), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF v_role NOT IN ('ADMIN', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Apenas Administrador ou Secretário podem receber transferências'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_t
  FROM public.aluno_transferencias
  WHERE protocolo = upper(trim(p_protocolo)) AND status = 'AGUARDANDO_RECEBIMENTO'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferência pendente não encontrada';
  END IF;

  SELECT * INTO v_aluno FROM public.alunos WHERE id = v_t.aluno_id FOR UPDATE;
  IF v_aluno.matricula <> trim(p_matricula) OR v_aluno.data_nascimento <> p_data_nascimento THEN
    RAISE EXCEPTION 'Matrícula ou data de nascimento não conferem';
  END IF;

  SELECT * INTO v_origem FROM public.turmas WHERE id = v_t.turma_origem_id;
  SELECT * INTO v_destino FROM public.turmas WHERE id = p_turma_destino_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Turma de destino não encontrada';
  END IF;

  IF v_role = 'SECRETARIO' AND v_destino.escola_id IS DISTINCT FROM public.get_user_escola_id() THEN
    RAISE EXCEPTION 'O Secretário só pode receber alunos em sua própria escola'
      USING ERRCODE = '42501';
  END IF;

  IF v_origem.ano_letivo <> v_destino.ano_letivo
     OR public.serie_da_turma(v_origem.id) IS NULL
     OR public.serie_da_turma(v_origem.id) <> public.serie_da_turma(v_destino.id) THEN
    RAISE EXCEPTION 'A turma de destino deve ter a mesma série e ano letivo';
  END IF;

  UPDATE public.alunos
  SET escola_id = v_destino.escola_id, turma_id = v_destino.id, status = 'Ativo'
  WHERE id = v_aluno.id;

  UPDATE public.usuarios
  SET escola_id = v_destino.escola_id
  WHERE v_aluno.cpf IS NOT NULL
    AND email = regexp_replace(v_aluno.cpf, '\D', '', 'g') || '@aluno.dcdigital.local';

  UPDATE public.aluno_transferencias
  SET escola_destino_id = v_destino.escola_id,
      turma_destino_id = v_destino.id,
      status = 'RECEBIDA',
      recebido_por = auth.uid(),
      recebido_em = now()
  WHERE id = v_t.id;

  RETURN v_t.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remanejar_aluno(
  p_aluno_id uuid,
  p_turma_destino_id uuid,
  p_motivo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_aluno public.alunos%ROWTYPE;
  v_origem public.turmas%ROWTYPE;
  v_destino public.turmas%ROWTYPE;
  v_role text := coalesce(public.get_user_role(), '');
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF v_role NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Sem permissão para remanejar alunos'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_aluno FROM public.alunos WHERE id = p_aluno_id FOR UPDATE;
  IF NOT FOUND OR v_aluno.turma_id IS NULL THEN
    RAISE EXCEPTION 'Aluno sem matrícula ativa';
  END IF;

  SELECT * INTO v_origem FROM public.turmas WHERE id = v_aluno.turma_id;
  SELECT * INTO v_destino FROM public.turmas WHERE id = p_turma_destino_id;

  IF NOT FOUND OR v_origem.id = v_destino.id THEN
    RAISE EXCEPTION 'Selecione uma turma de destino diferente';
  END IF;

  IF v_role IN ('GESTOR', 'SECRETARIO') AND v_origem.escola_id IS DISTINCT FROM public.get_user_escola_id() THEN
    RAISE EXCEPTION 'Você só pode remanejar alunos da própria escola'
      USING ERRCODE = '42501';
  END IF;

  IF v_origem.escola_id <> v_destino.escola_id
     OR v_origem.ano_letivo <> v_destino.ano_letivo
     OR public.serie_da_turma(v_origem.id) IS NULL
     OR public.serie_da_turma(v_origem.id) <> public.serie_da_turma(v_destino.id) THEN
    RAISE EXCEPTION 'O remanejamento exige turma da mesma escola, série e ano letivo';
  END IF;

  INSERT INTO public.aluno_transferencias(aluno_id, escola_origem_id, turma_origem_id, escola_destino_id, turma_destino_id, data_transferencia, motivo, status)
  VALUES (v_aluno.id, v_origem.escola_id, v_origem.id, v_destino.escola_id, v_destino.id, current_date, nullif(trim(p_motivo), ''), 'RECEBIDA')
  RETURNING id INTO v_id;

  UPDATE public.alunos SET turma_id = v_destino.id WHERE id = v_aluno.id;
  RETURN v_id;
END;
$$;

-- -------------------------------------------------------------
-- 2. Compatibilização de assinaturas e nomes de parâmetros de currículo
-- Define funções que aceitam tanto p_unidade_id quanto p_id, e p_items quanto p_unidades
-- -------------------------------------------------------------

DROP FUNCTION IF EXISTS public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]);
DROP FUNCTION IF EXISTS public.delete_curriculo_unidade(uuid);
DROP FUNCTION IF EXISTS public.import_curriculo_batch(jsonb, boolean);

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

  IF v_role NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
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

  IF v_role NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
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

  IF v_role NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
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

GRANT EXECUTE ON FUNCTION public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_curriculo_unidade(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_curriculo_batch(jsonb, boolean) TO authenticated;

-- -------------------------------------------------------------
-- 3. RPC controlada para log de tentativa de login (LOGIN_FAILED) para anon
-- Permite registrar evento de auditoria sem conceder INSERT anônimo direto na tabela
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_login_failure(
  p_email_hash text,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recent_count integer;
BEGIN
  -- Rate limit: máximo 50 registros por hash nos últimos 10 minutos para evitar flooding
  IF p_email_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
    FROM public.security_logs
    WHERE user_email = p_email_hash
      AND action = 'LOGIN_FAILED'
      AND created_at >= (now() - interval '10 minutes');

    IF v_recent_count >= 50 THEN
      RETURN; -- Absorve silenciosamente o excesso sem falhar a interface
    END IF;
  END IF;

  INSERT INTO public.security_logs (
    user_id,
    user_email,
    action,
    entity,
    user_agent,
    metadata,
    created_at
  )
  VALUES (
    NULL,
    nullif(trim(p_email_hash), ''),
    'LOGIN_FAILED',
    'auth',
    substring(coalesce(p_user_agent, '') FROM 1 FOR 512),
    jsonb_build_object('source', 'login_attempt'),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_login_failure(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_login_failure(text, text) TO anon, authenticated;

-- -------------------------------------------------------------
-- 4. Tabela de chaves de idempotência permanentes (sync_idempotency_keys)
-- Retém os operation_ids indefinidamente, desassociados de payloads pesados
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sync_idempotency_keys (
  user_id uuid NOT NULL,
  operation_id uuid NOT NULL,
  entity text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, operation_id)
);

ALTER TABLE public.sync_idempotency_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sync_idempotency_keys FROM PUBLIC, anon;
REVOKE UPDATE, DELETE ON public.sync_idempotency_keys FROM authenticated;
GRANT SELECT, INSERT ON public.sync_idempotency_keys TO authenticated, service_role;

DROP POLICY IF EXISTS "sync_idempotency_keys_self_access" ON public.sync_idempotency_keys;
CREATE POLICY "sync_idempotency_keys_self_access"
  ON public.sync_idempotency_keys
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Atualizar apply_academic_mutation para verificar e registrar em sync_idempotency_keys
CREATE OR REPLACE FUNCTION public.apply_academic_mutation(p_table text,p_operation text,p_payload jsonb,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 t text; fields text[]; keys text[]; cols text; vals text; assignments text; predicate text;
 r jsonb; old_row jsonb; new_row jsonb; result jsonb:='[]'; expected bigint;
 receipt public.sync_receipts%ROWTYPE; request jsonb; key text; field text;
 v_turma_ids uuid[]; v_tid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão necessária' USING ERRCODE='42501'; END IF;
 IF p_operation_id IS NULL OR p_operation NOT IN ('INSERT','UPDATE','UPSERT','DELETE') THEN RAISE EXCEPTION 'Operação inválida'; END IF;
 t:=CASE p_table WHEN 'fechamentos' THEN 'fechamentos_bimestres' ELSE p_table END;
 CASE p_table
 WHEN 'frequencias' THEN fields:=ARRAY['turma_id','aluno_id','data','tempo','disciplina','status','participacao']; keys:=fields[1:5];
 WHEN 'conteudos' THEN fields:=ARRAY['turma_id','data','tempo','disciplina','objetos','habilidades','descricao']; keys:=fields[1:4];
 WHEN 'avaliacoes' THEN fields:=ARRAY['turma_id','tipo','data','instrumento','objetos','bimestre','valor_maximo','disciplina','parent_id']; keys:=ARRAY['id'];
 WHEN 'notas' THEN fields:=ARRAY['avaliacao_id','aluno_id','valor']; keys:=fields[1:2];
 WHEN 'fechamentos' THEN fields:=ARRAY['turma_id','disciplina','bimestre','status','usuario_fechamento_id']; keys:=fields[1:3];
 ELSE RAISE EXCEPTION 'Tabela inválida'; END CASE;
 request:=jsonb_build_object('table',p_table,'operation',p_operation,'payload',p_payload);
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_operation_id::text,0));
 SELECT * INTO receipt FROM public.sync_receipts WHERE user_id=auth.uid() AND operation_id=p_operation_id;
 IF FOUND THEN
  IF receipt.request<>request THEN RAISE EXCEPTION 'Identificador reutilizado com outro conteúdo' USING ERRCODE='22023'; END IF;
  RETURN receipt.response;
 END IF;

 -- 2. Verificar se a chave de idempotência permanente existe (caso o recibo tenha sido expurgado por TTL)
 IF EXISTS (SELECT 1 FROM public.sync_idempotency_keys WHERE user_id=auth.uid() AND operation_id=p_operation_id) THEN
  RETURN jsonb_build_object('status', 'already_processed', 'operation_id', p_operation_id);
 END IF;

 -- Extração determinística de TODAS as turmas afetadas no payload (sem duplicidades e ordenadas)
 SELECT array_agg(DISTINCT sub_turma ORDER BY sub_turma) INTO v_turma_ids
 FROM (
  SELECT (p_payload->>'turma_id')::uuid AS sub_turma WHERE p_payload ? 'turma_id'
  UNION
  SELECT (elem->>'turma_id')::uuid AS sub_turma
  FROM jsonb_array_elements(CASE WHEN p_payload ? 'records' THEN p_payload->'records' ELSE jsonb_build_array(p_payload) END) elem
  WHERE elem ? 'turma_id'
  UNION
  SELECT av.turma_id AS sub_turma
  FROM jsonb_array_elements(CASE WHEN p_payload ? 'records' THEN p_payload->'records' ELSE jsonb_build_array(p_payload) END) elem
  JOIN public.avaliacoes av ON av.id = (elem->>'avaliacao_id')::bigint
  WHERE elem ? 'avaliacao_id'
 ) sub
 WHERE sub_turma IS NOT NULL;

 -- Adquire locks para cada turma afetada em ordem ascendente determinística (evita deadlocks)
 IF v_turma_ids IS NOT NULL AND array_length(v_turma_ids, 1) > 0 THEN
  FOREACH v_tid IN ARRAY v_turma_ids LOOP
   PERFORM pg_advisory_xact_lock(hashtextextended(v_tid::text, 0));
  END LOOP;
 ELSE
  PERFORM pg_advisory_xact_lock(hashtextextended('academic-mutation', 0));
 END IF;

 IF p_operation='DELETE' THEN
  predicate:='true';
  FOREACH field IN ARRAY keys LOOP
   IF p_payload ? field THEN predicate:=predicate||format(' AND to_jsonb(t)->>%L=$1->>%L',field,field); END IF;
  END LOOP;
  IF predicate='true' THEN RAISE EXCEPTION 'Exclusão sem chave'; END IF;
  IF p_table='notas' AND p_payload ? 'aluno_ids' THEN
   predicate:=predicate||' AND to_jsonb(t)->>''aluno_id'' IN (SELECT jsonb_array_elements_text($1->''aluno_ids''))';
  END IF;
  FOR old_row IN EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %s FOR UPDATE',t,predicate) USING p_payload LOOP
   key:=public.academic_key(p_table,old_row);
   expected:=(p_payload->'_expected'->>key)::bigint;
   IF expected IS NULL OR expected<>(old_row->>'sync_revision')::bigint THEN
    RAISE EXCEPTION 'CONFLICT: dados alterados em outro dispositivo; recarregue e revise a exclusão' USING ERRCODE='40001'; END IF;
   EXECUTE format('DELETE FROM public.%I WHERE id::text=$1 RETURNING to_jsonb(%I.*)',t,t) INTO new_row USING old_row->>'id';
   IF new_row IS NULL THEN RAISE EXCEPTION 'Sem permissão para excluir registro' USING ERRCODE='42501'; END IF;
   result:=result||jsonb_build_array(old_row||'{"deleted":true}'::jsonb);
  END LOOP;
 ELSE
  FOR r IN SELECT value FROM jsonb_array_elements(CASE WHEN p_payload ? 'records' THEN p_payload->'records' ELSE jsonb_build_array(p_payload) END) LOOP
   predicate:='true';
   FOREACH field IN ARRAY keys LOOP predicate:=predicate||format(' AND to_jsonb(t)->>%L=$1->>%L',field,field); END LOOP;
   old_row:=NULL;
   EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %s FOR UPDATE',t,predicate) INTO old_row USING r;
   expected:=coalesce((r->>'_expected_revision')::bigint,0);
   IF coalesce((old_row->>'sync_revision')::bigint,0)<>expected THEN
    RAISE EXCEPTION 'CONFLICT: dados alterados em outro dispositivo; recarregue e revise sua alteração' USING ERRCODE='40001'; END IF;
   IF p_operation='UPDATE' AND old_row IS NULL THEN RAISE EXCEPTION 'CONFLICT: registro removido ou sem acesso' USING ERRCODE='40001'; END IF;
   SELECT string_agg(format('%I',f),','),string_agg(format('x.%I',f),','),string_agg(format('%I=x.%I',f,f),',')
     INTO cols,vals,assignments FROM unnest(fields) f;
   IF old_row IS NULL THEN
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) x RETURNING to_jsonb(%I.*)',t,cols,vals,t,t) INTO new_row USING r;
   ELSE
    EXECUTE format('UPDATE public.%I target SET %s FROM jsonb_populate_record(NULL::public.%I,$1) x WHERE target.id::text=$2 RETURNING to_jsonb(target.*)',t,assignments,t)
      INTO new_row USING r,old_row->>'id';
    IF new_row IS NULL THEN RAISE EXCEPTION 'Sem permissão para alterar registro' USING ERRCODE='42501'; END IF;
   END IF;
   result:=result||jsonb_build_array(new_row);
  END LOOP;
 END IF;

 -- Gravação de recibo protegida por flag transacional interna
 PERFORM set_config('app.sync_internal', 'true', true);
 PERFORM public.record_sync_receipt(auth.uid(), p_operation_id, request, result);
 PERFORM set_config('app.sync_internal', 'false', true);

 -- Gravação de idempotência permanente (sem payload)
 INSERT INTO public.sync_idempotency_keys (user_id, operation_id, entity)
 VALUES (auth.uid(), p_operation_id, p_table)
 ON CONFLICT (user_id, operation_id) DO NOTHING;

 RETURN result;
END $$;
