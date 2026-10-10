-- Sincronização acadêmica: a busca de cada registro deixava de usar índice.
-- A comparação to_jsonb(t)->>'coluna' obrigava varredura completa, e as regras de acesso
-- por linha rodavam em todas as linhas antes do filtro. Com 2.4 mil frequências, cada aluno
-- levava ~1s; um lote de turma passava do limite de 8s do papel authenticated.
-- Agora cada chave é comparada por coluna tipada, o que permite usar os índices existentes.
CREATE OR REPLACE FUNCTION public.apply_academic_mutation(
  p_table text,
  p_operation text,
  p_payload jsonb,
  p_operation_id uuid DEFAULT gen_random_uuid()
)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 t text; fields text[]; keys text[]; cols text; vals text; assignments text; predicate text;
 r jsonb; old_row jsonb; new_row jsonb; result jsonb:='[]'; expected bigint;
 receipt public.sync_receipts%ROWTYPE; request jsonb; key text; field text;
 v_turma_ids uuid[]; v_tid uuid;
 conflicts jsonb := '[]'; outcome jsonb; v_saved jsonb;
BEGIN
 -- Proteção contra travamento indefinido de locks: timeout de 10s
 PERFORM set_config('lock_timeout', '10s', true);

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
 SELECT response INTO v_saved FROM public.sync_idempotency_keys WHERE user_id=auth.uid() AND operation_id=p_operation_id;
 IF FOUND THEN
  IF v_saved IS NOT NULL THEN RETURN v_saved; END IF;
  RETURN jsonb_build_object('status', 'already_processed', 'operation_id', p_operation_id);
 END IF;

 -- Extração determinística de TODAS as turmas afetadas no payload (sem duplicidades, ordenada e protegida contra casts inválidos)
 SELECT array_agg(DISTINCT sub_turma ORDER BY sub_turma) INTO v_turma_ids
 FROM (
  SELECT (p_payload->>'turma_id')::uuid AS sub_turma
  WHERE p_payload ? 'turma_id' AND (p_payload->>'turma_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  UNION
  SELECT (elem->>'turma_id')::uuid AS sub_turma
  FROM jsonb_array_elements(CASE WHEN p_payload ? 'records' THEN p_payload->'records' ELSE jsonb_build_array(p_payload) END) elem
  WHERE elem ? 'turma_id' AND (elem->>'turma_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  UNION
  SELECT av.turma_id AS sub_turma
  FROM jsonb_array_elements(CASE WHEN p_payload ? 'records' THEN p_payload->'records' ELSE jsonb_build_array(p_payload) END) elem
  JOIN public.avaliacoes av ON av.id = (elem->>'avaliacao_id')::bigint
  WHERE elem ? 'avaliacao_id' AND (elem->>'avaliacao_id') ~ '^[0-9]+$'
 ) sub
 WHERE sub_turma IS NOT NULL;

 -- Adquire locks para cada turma afetada em ordem ascendente determinística (evita deadlocks)
 IF v_turma_ids IS NOT NULL AND array_length(v_turma_ids, 1) > 0 THEN
  FOREACH v_tid IN ARRAY v_turma_ids LOOP
   PERFORM pg_advisory_xact_lock(hashtextextended(v_tid::text, 0));
  END LOOP;
 ELSE
  -- Lock por usuário para operações sem turma_id explícita em vez de lock global compartilhado
  PERFORM pg_advisory_xact_lock(hashtextextended('academic-mutation-' || auth.uid()::text, 0));
 END IF;

 IF p_operation='DELETE' THEN
  predicate:='true';
  FOREACH field IN ARRAY keys LOOP
   IF p_payload ? field THEN predicate:=predicate||format(' AND t.%I = (SELECT x.%I FROM jsonb_populate_record(NULL::public.%I,$1) x)',field,field,t); END IF;
  END LOOP;
  IF predicate='true' THEN RAISE EXCEPTION 'Exclusão sem chave'; END IF;
  IF p_table='notas' AND p_payload ? 'aluno_ids' THEN
   predicate:=predicate||' AND to_jsonb(t)->>''aluno_id'' IN (SELECT jsonb_array_elements_text($1->''aluno_ids''))';
  END IF;
  FOR old_row IN EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %s FOR UPDATE',t,predicate) USING p_payload LOOP
   key:=public.academic_key(p_table,old_row);
   expected:=(p_payload->'_expected'->>key)::bigint;
   IF expected IS NULL OR expected<>(old_row->>'sync_revision')::bigint THEN
    conflicts := conflicts || jsonb_build_array(old_row);
    CONTINUE;
   END IF;
   EXECUTE format('DELETE FROM public.%I WHERE id = (SELECT y.id FROM jsonb_populate_record(NULL::public.%I,$1) y) RETURNING to_jsonb(%I.*)',t,t,t) INTO new_row USING old_row;
   IF new_row IS NULL THEN RAISE EXCEPTION 'Sem permissão para excluir registro' USING ERRCODE='42501'; END IF;
   result:=result||jsonb_build_array(old_row||'{"deleted":true}'::jsonb);
  END LOOP;
 ELSE
  FOR r IN SELECT value FROM jsonb_array_elements(CASE WHEN p_payload ? 'records' THEN p_payload->'records' ELSE jsonb_build_array(p_payload) END) LOOP
   predicate:='true';
   FOREACH field IN ARRAY keys LOOP predicate:=predicate||format(' AND t.%I = (SELECT x.%I FROM jsonb_populate_record(NULL::public.%I,$1) x)',field,field,t); END LOOP;
   old_row:=NULL;
   EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE %s FOR UPDATE',t,predicate) INTO old_row USING r;
   expected:=coalesce((r->>'_expected_revision')::bigint,0);
   IF coalesce((old_row->>'sync_revision')::bigint,0)<>expected
      OR (p_operation='UPDATE' AND old_row IS NULL) THEN
    conflicts := conflicts || jsonb_build_array(r);
    CONTINUE;
   END IF;
   SELECT string_agg(format('%I',f),','),string_agg(format('x.%I',f),','),string_agg(format('%I=x.%I',f,f),',')
     INTO cols,vals,assignments FROM unnest(fields) f;
   IF old_row IS NULL THEN
    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) x RETURNING to_jsonb(%I.*)',t,cols,vals,t,t) INTO new_row USING r;
   ELSE
    EXECUTE format('UPDATE public.%I target SET %s FROM jsonb_populate_record(NULL::public.%I,$1) x WHERE target.id = (SELECT y.id FROM jsonb_populate_record(NULL::public.%I,$2) y) RETURNING to_jsonb(target.*)',t,assignments,t,t)
      INTO new_row USING r,old_row;
    IF new_row IS NULL THEN RAISE EXCEPTION 'Sem permissão para alterar registro' USING ERRCODE='42501'; END IF;
   END IF;
   result:=result||jsonb_build_array(new_row);
  END LOOP;
 END IF;

 -- Gravação de recibo protegida por flag transacional interna
 outcome := CASE WHEN jsonb_array_length(conflicts) > 0
  THEN jsonb_build_object('status','partial','applied',result,'conflicts',conflicts)
  ELSE result END;
 PERFORM set_config('app.sync_internal', 'true', true);
 PERFORM public.record_sync_receipt(auth.uid(), p_operation_id, request, outcome);
 PERFORM public.record_sync_idempotency_key(auth.uid(), p_operation_id, p_table, outcome);
 PERFORM set_config('app.sync_internal', 'false', true);

 -- Gravação de idempotência permanente (sem payload)
 

 RETURN outcome;
END $$;

GRANT EXECUTE ON FUNCTION public.apply_academic_mutation(text, text, jsonb, uuid) TO authenticated;
