-- =============================================================
-- Migration: 20260928000002_audit_transactions_and_scale.sql
-- Auditoria Técnica — Etapa 2 e 3: Transações, Concorrência e Escalabilidade
-- 1. RPC atômica: upsert_curriculo_unidade_com_objetos (criação e importação)
-- 2. RPC atômica: criar_professor_com_alocacao (professor + alocação inicial)
-- 3. Granularização de locks por turma na sincronização acadêmica
-- 4. Retenção e limpeza de sync_receipts com índice por created_at
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. RPC atômica para criação / importação de currículo
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.upsert_curriculo_unidade_com_objetos(
  p_modalidade text,
  p_ano text,
  p_disciplina text,
  p_bimestre text,
  p_nome text,
  p_objetos text[],
  p_substituir boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_unidade_id uuid;
  v_desc text;
  v_old_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF v_role NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Permissão negada para gerenciar currículo' USING ERRCODE = '42501';
  END IF;

  -- Se substituir for solicitado, remove unidades e objetos anteriores com mesmos critérios
  IF p_substituir THEN
    SELECT array_agg(id) INTO v_old_ids
    FROM public.curriculo_unidades
    WHERE modalidade = p_modalidade
      AND ano = p_ano
      AND disciplina = p_disciplina
      AND bimestre = p_bimestre;

    IF v_old_ids IS NOT NULL AND array_length(v_old_ids, 1) > 0 THEN
      DELETE FROM public.curriculo_objetos WHERE unidade_id = ANY(v_old_ids);
      DELETE FROM public.curriculo_unidades WHERE id = ANY(v_old_ids);
    END IF;
  END IF;

  -- Inserir nova unidade
  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES (p_modalidade, p_ano, p_disciplina, p_bimestre, coalesce(nullif(trim(p_nome), ''), 'Conteúdo Ministrado'))
  RETURNING id INTO v_unidade_id;

  -- Inserir objetos de conhecimento atrelados
  IF p_objetos IS NOT NULL THEN
    FOREACH v_desc IN ARRAY p_objetos
    LOOP
      IF trim(v_desc) <> '' THEN
        INSERT INTO public.curriculo_objetos (unidade_id, descricao)
        VALUES (v_unidade_id, trim(v_desc));
      END IF;
    END LOOP;
  END IF;

  RETURN v_unidade_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_curriculo_unidade_com_objetos(text, text, text, text, text, text[], boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_curriculo_unidade_com_objetos(text, text, text, text, text, text[], boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_curriculo_unidade_com_objetos(text, text, text, text, text, text[], boolean) TO authenticated;

-- -------------------------------------------------------------
-- 2. RPC atômica para criação de professor + alocação
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_professor_com_alocacao(
  p_nome text,
  p_email text,
  p_telefone text,
  p_departamento text,
  p_disciplinas text[],
  p_escola_id uuid,
  p_turno text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_user_escola_id uuid := public.get_user_escola_id();
  v_prof public.professores%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  -- Autorização: ADMIN ou GESTOR/SECRETARIO da mesma escola
  IF v_role = 'ADMIN' THEN
    NULL;
  ELSIF v_role IN ('GESTOR', 'SECRETARIO') THEN
    IF p_escola_id IS DISTINCT FROM v_user_escola_id THEN
      RAISE EXCEPTION 'Permissão negada: você só pode alocar professores na sua própria escola' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Permissão negada para cadastrar professor' USING ERRCODE = '42501';
  END IF;

  -- 1. Inserir professor
  INSERT INTO public.professores (nome, email, telefone, departamento, disciplinas)
  VALUES (
    trim(p_nome),
    lower(nullif(trim(p_email), '')),
    nullif(trim(p_telefone), ''),
    coalesce(nullif(trim(p_departamento), ''), 'Geral'),
    coalesce(p_disciplinas, ARRAY[]::text[])
  )
  RETURNING * INTO v_prof;

  -- 2. Inserir alocação escolar se fornecida
  IF p_escola_id IS NOT NULL THEN
    INSERT INTO public.professor_alocacoes (professor_id, escola_id, turno)
    VALUES (v_prof.id, p_escola_id, coalesce(nullif(trim(p_turno), ''), 'Manhã'));
  END IF;

  RETURN to_jsonb(v_prof);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_professor_com_alocacao(text, text, text, text, text[], uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_professor_com_alocacao(text, text, text, text, text[], uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.criar_professor_com_alocacao(text, text, text, text, text[], uuid, text) TO authenticated;

-- -------------------------------------------------------------
-- 3. Granularização de locks na sincronização acadêmica
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_academic_mutation(p_table text,p_operation text,p_payload jsonb,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 t text; fields text[]; keys text[]; cols text; vals text; assignments text; predicate text;
 r jsonb; old_row jsonb; new_row jsonb; result jsonb:='[]'; expected bigint;
 receipt public.sync_receipts%ROWTYPE; request jsonb; key text; field text;
 v_turma_id uuid;
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

 -- Extração determinística da turma_id para lock granular
 IF p_payload ? 'turma_id' THEN
  v_turma_id := (p_payload->>'turma_id')::uuid;
 ELSIF p_payload ? 'records' AND (p_payload->'records'->0) ? 'turma_id' THEN
  v_turma_id := (p_payload->'records'->0->>'turma_id')::uuid;
 ELSIF p_payload ? 'avaliacao_id' THEN
  SELECT turma_id INTO v_turma_id FROM public.avaliacoes WHERE id = (p_payload->>'avaliacao_id')::bigint;
 ELSIF p_payload ? 'records' AND (p_payload->'records'->0) ? 'avaliacao_id' THEN
  SELECT turma_id INTO v_turma_id FROM public.avaliacoes WHERE id = (p_payload->'records'->0->>'avaliacao_id')::bigint;
 END IF;

 -- Lock granular por turma serializa escritas daquela turma sem bloquear outras turmas/escolas
 IF v_turma_id IS NOT NULL THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_turma_id::text, 0));
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
 PERFORM public.record_sync_receipt(auth.uid(), p_operation_id, request, result);
 RETURN result;
END $$;

-- -------------------------------------------------------------
-- 4. Índice e função de retenção de sync_receipts
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sync_receipts_created_at ON public.sync_receipts (created_at);

CREATE OR REPLACE FUNCTION public.cleanup_sync_receipts(p_retention_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted integer;
BEGIN
  IF public.get_user_role() <> 'ADMIN' AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Apenas administradores podem executar a limpeza de recibos' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.sync_receipts
  WHERE created_at < NOW() - (p_retention_days || ' days')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_sync_receipts(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_sync_receipts(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.cleanup_sync_receipts(integer) TO authenticated, service_role;

COMMIT;
