BEGIN;
CREATE SEQUENCE IF NOT EXISTS public.academic_revision_seq START WITH 2;
GRANT USAGE ON SEQUENCE public.academic_revision_seq TO authenticated,service_role;
-- Monotonic revisions are assigned by the database, including writes outside the sync RPC.
CREATE OR REPLACE FUNCTION public.bump_academic_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.sync_revision:=nextval('public.academic_revision_seq');
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['frequencias','conteudos','avaliacoes','notas','fechamentos_bimestres'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS sync_revision bigint NOT NULL DEFAULT 1',t);
  EXECUTE format('DROP TRIGGER IF EXISTS audit_revision ON public.%I', t);
  EXECUTE format('CREATE TRIGGER audit_revision BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bump_academic_revision()',t);
 END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.sync_receipts (
 user_id uuid NOT NULL DEFAULT auth.uid(), operation_id uuid NOT NULL,
 request jsonb NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,operation_id)
);
ALTER TABLE public.sync_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_receipt_read ON public.sync_receipts;
CREATE POLICY own_receipt_read ON public.sync_receipts FOR SELECT TO authenticated USING(user_id=auth.uid());
DROP POLICY IF EXISTS own_receipt_insert ON public.sync_receipts;
CREATE POLICY own_receipt_insert ON public.sync_receipts FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid());
GRANT SELECT,INSERT ON public.sync_receipts TO authenticated;

CREATE OR REPLACE FUNCTION public.academic_key(p_table text,p_row jsonb) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE p_table
 WHEN 'frequencias' THEN jsonb_build_array(p_row->>'turma_id',p_row->>'aluno_id',p_row->>'data',p_row->>'tempo',p_row->>'disciplina')::text
 WHEN 'conteudos' THEN jsonb_build_array(p_row->>'turma_id',p_row->>'data',p_row->>'tempo',p_row->>'disciplina')::text
 WHEN 'notas' THEN jsonb_build_array(p_row->>'avaliacao_id',p_row->>'aluno_id')::text
 WHEN 'avaliacoes' THEN jsonb_build_array(p_row->>'id')::text
 WHEN 'fechamentos' THEN jsonb_build_array(p_row->>'turma_id',p_row->>'disciplina',p_row->>'bimestre')::text END
$$;

CREATE OR REPLACE FUNCTION public.apply_academic_mutation(p_table text,p_operation text,p_payload jsonb,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE
 t text; fields text[]; keys text[]; cols text; vals text; assignments text; predicate text;
 r jsonb; old_row jsonb; new_row jsonb; result jsonb:='[]'; expected bigint;
 receipt public.sync_receipts%ROWTYPE; request jsonb; key text; field text;
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
 -- A single writer across academic mutations avoids deadlocks for overlapping batches.
 -- Per-class locks in triggers also serialize closing versus direct academic writes.
 PERFORM pg_advisory_xact_lock(hashtextextended('academic-mutation',0));
 IF p_operation='DELETE' THEN
  predicate:='true';
  FOREACH field IN ARRAY keys LOOP
   IF p_payload ? field THEN predicate:=predicate||format(' AND to_jsonb(t)->>%L=$1->>%L',field,field); END IF;
  END LOOP;
  IF predicate='true' THEN RAISE EXCEPTION 'Exclusão sem chave'; END IF;
  IF p_table='notas' AND p_payload ? 'aluno_ids' THEN
   predicate:=predicate||' AND to_jsonb(t)->>''aluno_id'' IN (SELECT jsonb_array_elements_text($1->''aluno_ids''))';
  END IF;
  -- Require a snapshot for every affected row; no blind deletes of unseen remote data.
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
 INSERT INTO public.sync_receipts(user_id,operation_id,request,response) VALUES(auth.uid(),p_operation_id,request,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.apply_academic_mutation(text,text,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_academic_mutation(text,text,jsonb,uuid) TO authenticated;
COMMIT;
