-- =============================================================
-- Migration: 20260928000003_audit_reaudit_hardening.sql
-- Resolução Completa dos Apontamentos da Reauditoria Técnica
-- 1. Proteção estrita de sync_receipts com guard transacional (fechamento de falsificação)
-- 2. Fail-closed em todas as funções SECURITY DEFINER contra role NULL
-- 3. Restauração dos campos cpf, vinculo e status em criar_professor_com_alocacao
-- 4. RPCs atômicas de edição, importação em lote e exclusão em cascata de currículo
-- 5. Foreign keys com ON DELETE CASCADE em curriculo_objetos e curriculo_habilidades
-- 6. Lock multi-turma determinístico em apply_academic_mutation
-- 7. Hardening de security_logs (revogação total de inserção anônima)
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Proteção de sync_receipts contra falsificação externa
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_sync_receipt(
  p_user_id uuid,
  p_operation_id uuid,
  p_request jsonb,
  p_response jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Guard transacional: só permite execução se ativado internamente por apply_academic_mutation
  IF current_setting('app.sync_internal', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Acesso negado: recibos de sincronização só podem ser gerados internamente pelo protocolo'
    USING ERRCODE = '42501';
  END IF;

  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sessão inválida para gravação de recibo' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sync_receipts (user_id, operation_id, request, response)
  VALUES (p_user_id, p_operation_id, p_request, p_response);
END;
$$;

REVOKE ALL ON FUNCTION public.record_sync_receipt(uuid, uuid, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_sync_receipt(uuid, uuid, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_sync_receipt(uuid, uuid, jsonb, jsonb) TO authenticated, service_role;

-- -------------------------------------------------------------
-- 2. apply_academic_mutation com lock multi-turma e guard de receipts
-- -------------------------------------------------------------
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

 RETURN result;
END $$;

-- -------------------------------------------------------------
-- 3. Fail-closed em cleanup_sync_receipts
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_sync_receipts(p_retention_days integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_auth_role text := coalesce(auth.role(), '');
  v_deleted integer;
BEGIN
  -- Validação estrita fail-closed
  IF coalesce(v_role, '') <> 'ADMIN' AND v_auth_role <> 'service_role' THEN
    RAISE EXCEPTION 'Apenas administradores podem executar a limpeza de recibos' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.sync_receipts
  WHERE created_at < NOW() - (p_retention_days || ' days')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- -------------------------------------------------------------
-- 4. Restauração dos campos completos em criar_professor_com_alocacao (fail-closed)
-- -------------------------------------------------------------
DROP FUNCTION IF EXISTS public.criar_professor_com_alocacao(text, text, text, text, text[], uuid, text);

CREATE OR REPLACE FUNCTION public.criar_professor_com_alocacao(
  p_nome text,
  p_email text,
  p_telefone text,
  p_departamento text,
  p_disciplinas text[],
  p_escola_id uuid,
  p_turno text,
  p_cpf text DEFAULT NULL,
  p_vinculo text DEFAULT 'Concursado',
  p_status text DEFAULT 'Ativo'
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

  -- Fail-closed
  IF coalesce(v_role, '') = 'ADMIN' THEN
    NULL;
  ELSIF coalesce(v_role, '') IN ('GESTOR', 'SECRETARIO') THEN
    IF p_escola_id IS DISTINCT FROM v_user_escola_id THEN
      RAISE EXCEPTION 'Permissão negada: você só pode alocar professores na sua própria escola' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Permissão negada para cadastrar professor' USING ERRCODE = '42501';
  END IF;

  -- Inserir professor com campos completos restaurados
  INSERT INTO public.professores (
    nome, email, telefone, departamento, disciplinas, cpf, vinculo, status
  )
  VALUES (
    trim(p_nome),
    lower(nullif(trim(p_email), '')),
    nullif(trim(p_telefone), ''),
    coalesce(nullif(trim(p_departamento), ''), 'Geral'),
    coalesce(p_disciplinas, ARRAY[]::text[]),
    nullif(trim(p_cpf), ''),
    coalesce(nullif(trim(p_vinculo), ''), 'Concursado'),
    coalesce(nullif(trim(p_status), ''), 'Ativo')
  )
  RETURNING * INTO v_prof;

  IF p_escola_id IS NOT NULL THEN
    INSERT INTO public.professor_alocacoes (professor_id, escola_id, turno)
    VALUES (v_prof.id, p_escola_id, coalesce(nullif(trim(p_turno), ''), 'Manhã'));
  END IF;

  RETURN to_jsonb(v_prof);
END;
$$;

REVOKE ALL ON FUNCTION public.criar_professor_com_alocacao(text, text, text, text, text[], uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.criar_professor_com_alocacao(text, text, text, text, text[], uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.criar_professor_com_alocacao(text, text, text, text, text[], uuid, text, text, text, text) TO authenticated;

-- -------------------------------------------------------------
-- 5. Cascade em foreign keys de currículo para evitar travamento em deleção
-- -------------------------------------------------------------
ALTER TABLE public.curriculo_objetos
  DROP CONSTRAINT IF EXISTS curriculo_objetos_unidade_id_fkey,
  ADD CONSTRAINT curriculo_objetos_unidade_id_fkey
    FOREIGN KEY (unidade_id) REFERENCES public.curriculo_unidades(id) ON DELETE CASCADE;

ALTER TABLE public.curriculo_habilidades
  DROP CONSTRAINT IF EXISTS curriculo_habilidades_unidade_id_fkey,
  ADD CONSTRAINT curriculo_habilidades_unidade_id_fkey
    FOREIGN KEY (unidade_id) REFERENCES public.curriculo_unidades(id) ON DELETE CASCADE;

-- -------------------------------------------------------------
-- 6. RPCs atômicas de Currículo: Edição, Importação em Lote e Exclusão (fail-closed)
-- -------------------------------------------------------------

-- Edição atômica de currículo (unidade + objetos)
DROP FUNCTION IF EXISTS public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]);
CREATE OR REPLACE FUNCTION public.update_curriculo_unidade_com_objetos(
  p_id uuid,
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
  v_role text := public.get_user_role();
  v_desc text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF coalesce(v_role, '') NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Permissão negada para editar currículo' USING ERRCODE = '42501';
  END IF;

  -- 1. Atualizar unidade
  UPDATE public.curriculo_unidades
  SET modalidade = p_modalidade,
      ano = p_ano,
      disciplina = p_disciplina,
      bimestre = p_bimestre,
      nome = coalesce(nullif(trim(p_nome), ''), 'Conteúdo Ministrado')
  WHERE id = p_id;

  -- 2. Substituir objetos de forma atômica
  DELETE FROM public.curriculo_objetos WHERE unidade_id = p_id;

  IF p_objetos IS NOT NULL THEN
    FOREACH v_desc IN ARRAY p_objetos
    LOOP
      IF trim(v_desc) <> '' THEN
        INSERT INTO public.curriculo_objetos (unidade_id, descricao)
        VALUES (p_id, trim(v_desc));
      END IF;
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_curriculo_unidade_com_objetos(uuid, text, text, text, text, text, text[]) TO authenticated;

-- Exclusão atômica de unidade de currículo
DROP FUNCTION IF EXISTS public.delete_curriculo_unidade(uuid);
CREATE OR REPLACE FUNCTION public.delete_curriculo_unidade(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.get_user_role();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF coalesce(v_role, '') NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Permissão negada para remover currículo' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.curriculo_habilidades WHERE unidade_id = p_id;
  DELETE FROM public.curriculo_objetos WHERE unidade_id = p_id;
  DELETE FROM public.curriculo_unidades WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_curriculo_unidade(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_curriculo_unidade(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_curriculo_unidade(uuid) TO authenticated;

-- Importação em lote completo de currículo em transação única
DROP FUNCTION IF EXISTS public.import_curriculo_batch(jsonb, boolean);
CREATE OR REPLACE FUNCTION public.import_curriculo_batch(
  p_unidades jsonb,
  p_substituir boolean DEFAULT false
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_elem jsonb;
  v_unidade_id uuid;
  v_desc text;
  v_count integer := 0;
  v_old_ids uuid[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  IF coalesce(v_role, '') NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Permissão negada para importar currículo' USING ERRCODE = '42501';
  END IF;

  -- Se substituir, remove previamente unidades e dependências dos critérios presentes no lote
  IF p_substituir THEN
    SELECT array_agg(DISTINCT u.id) INTO v_old_ids
    FROM public.curriculo_unidades u
    JOIN jsonb_array_elements(p_unidades) item ON
      u.modalidade = item->>'modalidade'
      AND u.ano = item->>'ano'
      AND u.disciplina = item->>'disciplina'
      AND u.bimestre = item->>'bimestre';

    IF v_old_ids IS NOT NULL AND array_length(v_old_ids, 1) > 0 THEN
      DELETE FROM public.curriculo_habilidades WHERE unidade_id = ANY(v_old_ids);
      DELETE FROM public.curriculo_objetos WHERE unidade_id = ANY(v_old_ids);
      DELETE FROM public.curriculo_unidades WHERE id = ANY(v_old_ids);
    END IF;
  END IF;

  -- Insere todas as unidades e objetos do lote na mesma transação
  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_unidades)
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

REVOKE ALL ON FUNCTION public.import_curriculo_batch(jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_curriculo_batch(jsonb, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.import_curriculo_batch(jsonb, boolean) TO authenticated;

-- Atualizar upsert_curriculo_unidade_com_objetos com fail-closed e remoção de habilidades
DROP FUNCTION IF EXISTS public.upsert_curriculo_unidade_com_objetos(text, text, text, text, text, text[], boolean);
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

  -- Fail-closed
  IF coalesce(v_role, '') NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Permissão negada para gerenciar currículo' USING ERRCODE = '42501';
  END IF;

  IF p_substituir THEN
    SELECT array_agg(id) INTO v_old_ids
    FROM public.curriculo_unidades
    WHERE modalidade = p_modalidade
      AND ano = p_ano
      AND disciplina = p_disciplina
      AND bimestre = p_bimestre;

    IF v_old_ids IS NOT NULL AND array_length(v_old_ids, 1) > 0 THEN
      DELETE FROM public.curriculo_habilidades WHERE unidade_id = ANY(v_old_ids);
      DELETE FROM public.curriculo_objetos WHERE unidade_id = ANY(v_old_ids);
      DELETE FROM public.curriculo_unidades WHERE id = ANY(v_old_ids);
    END IF;
  END IF;

  INSERT INTO public.curriculo_unidades (modalidade, ano, disciplina, bimestre, nome)
  VALUES (p_modalidade, p_ano, p_disciplina, p_bimestre, coalesce(nullif(trim(p_nome), ''), 'Conteúdo Ministrado'))
  RETURNING id INTO v_unidade_id;

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

-- -------------------------------------------------------------
-- 7. Hardening total em security_logs (fechamento de INSERT anônimo)
-- -------------------------------------------------------------
REVOKE INSERT ON public.security_logs FROM anon, PUBLIC;

DROP POLICY IF EXISTS "auth_insert_security_logs" ON public.security_logs;
CREATE POLICY "auth_insert_security_logs" ON public.security_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id IS NOT NULL AND user_id = auth.uid()
  );

COMMIT;
