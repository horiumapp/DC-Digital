-- Correções restantes da auditoria: leitura por disciplina, log de login,
-- limite LGPD, revogação do professor, recibo e chave de idempotência.

-- Professor lê nota e frequência só da disciplina em que está alocado.
DROP POLICY IF EXISTS "auth_select_frequencias" ON public.frequencias;
CREATE POLICY "auth_select_frequencias" ON public.frequencias
  FOR SELECT
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencias.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(frequencias.turma_id, frequencias.disciplina)
    OR public.aluno_e_o_proprio(frequencias.aluno_id)
  );

DROP POLICY IF EXISTS "auth_select_notas" ON public.notas;
CREATE POLICY "auth_select_notas" ON public.notas
  FOR SELECT
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND EXISTS (
        SELECT 1
        FROM public.avaliacoes av
        JOIN public.turmas t ON t.id = av.turma_id
        WHERE av.id = notas.avaliacao_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND public.professor_tem_acesso_a_turma_disciplina(av.turma_id, av.disciplina)
    )
    OR public.aluno_e_o_proprio(notas.aluno_id)
  );

-- Falha de login deixa de aceitar texto arbitrário de visitante anônimo.
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
  v_global_count integer;
BEGIN
  IF auth.role() = 'anon' OR auth.uid() IS NULL THEN
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('login_failure_global', 0));

  SELECT count(*) INTO v_global_count
  FROM public.security_logs
  WHERE action = 'LOGIN_FAILED'
    AND created_at >= (now() - interval '1 minute');

  IF v_global_count >= 30 THEN
    RETURN;
  END IF;

  IF p_email_hash IS NOT NULL THEN
    SELECT count(*) INTO v_recent_count
    FROM public.security_logs
    WHERE user_email = left(nullif(trim(p_email_hash), ''), 128)
      AND action = 'LOGIN_FAILED'
      AND created_at >= (now() - interval '10 minutes');

    IF v_recent_count >= 10 THEN
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.security_logs (
    user_id, user_email, action, entity, user_agent, metadata, created_at
  )
  VALUES (
    auth.uid(),
    left(nullif(trim(p_email_hash), ''), 128),
    'LOGIN_FAILED',
    'auth',
    substring(coalesce(p_user_agent, '') FROM 1 FOR 512),
    jsonb_build_object('source', 'login_attempt'),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_login_failure(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_login_failure(text, text) TO authenticated;

-- Limite global das solicitações LGPD, além do limite por e-mail.
CREATE OR REPLACE FUNCTION public.check_lgpd_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  recent_count integer;
  global_count integer;
  window_start timestamptz := now() - interval '15 minutes';
  v_email text;
BEGIN
  v_email := lower(trim(NEW.email));
  PERFORM pg_advisory_xact_lock(hashtextextended('lgpd_rate_limit:global', 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('lgpd_rate_limit:' || v_email, 0));

  SELECT count(*) INTO global_count
  FROM public.lgpd_requests
  WHERE created_at >= now() - interval '1 hour';

  IF global_count >= 30 THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Muitas solicitações LGPD nesta hora. Aguarde e tente novamente.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO recent_count
  FROM public.lgpd_requests
  WHERE email = v_email
    AND created_at >= window_start;

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Muitas solicitações deste e-mail. Aguarde 15 minutos.'
      USING ERRCODE = 'P0001';
  END IF;

  NEW.email := v_email;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.check_lgpd_rate_limit() FROM PUBLIC, anon, authenticated;

-- Excluir professor revoga o login. Histórico de frequência e nota permanece.
CREATE OR REPLACE FUNCTION public.admin_excluir_professor(p_professor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;
  IF public.get_user_role() <> 'ADMIN' THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir professores permanentemente' USING ERRCODE = '42501';
  END IF;

  SELECT usuario_id INTO v_usuario
  FROM public.professores
  WHERE id = p_professor_id;

  DELETE FROM public.professor_horarios WHERE professor_id = p_professor_id;
  DELETE FROM public.professor_alocacoes WHERE professor_id = p_professor_id;
  DELETE FROM public.professores WHERE id = p_professor_id;

  IF v_usuario IS NULL THEN
    RETURN;
  END IF;

  UPDATE auth.users
  SET banned_until = 'infinity'
  WHERE id = v_usuario;

  BEGIN
    DELETE FROM public.usuarios WHERE id = v_usuario;
    DELETE FROM auth.users WHERE id = v_usuario;
  EXCEPTION
    WHEN foreign_key_violation THEN
      UPDATE public.usuarios
      SET cargo = 'REVOGADO', escola_id = NULL
      WHERE id = v_usuario;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_excluir_professor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_excluir_professor(uuid) TO authenticated;

-- Retenção negativa não pode apagar recibos recentes.
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
  IF coalesce(v_role, '') <> 'ADMIN' AND v_auth_role <> 'service_role' THEN
    RAISE EXCEPTION 'Apenas administradores podem executar a limpeza de recibos' USING ERRCODE = '42501';
  END IF;
  IF p_retention_days IS NULL OR p_retention_days < 1 THEN
    RAISE EXCEPTION 'A retenção dos recibos precisa ser de pelo menos 1 dia' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.sync_receipts
  WHERE created_at < now() - (p_retention_days || ' days')::interval;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- A chave de idempotência só é gravada pelo protocolo, não por insert direto.
CREATE OR REPLACE FUNCTION public.record_sync_idempotency_key(
  p_user_id uuid,
  p_operation_id uuid,
  p_entity text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF current_setting('app.sync_internal', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Acesso negado: chave de sincronização só pode ser gerada pelo protocolo'
      USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Sessão inválida para gravação da chave' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sync_idempotency_keys (user_id, operation_id, entity)
  VALUES (p_user_id, p_operation_id, p_entity)
  ON CONFLICT (user_id, operation_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.record_sync_idempotency_key(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_sync_idempotency_key(uuid, uuid, text) TO authenticated, service_role;

REVOKE INSERT ON public.sync_idempotency_keys FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "sync_idempotency_keys_self_access" ON public.sync_idempotency_keys;
DROP POLICY IF EXISTS "sync_idempotency_keys_select" ON public.sync_idempotency_keys;
CREATE POLICY "sync_idempotency_keys_select"
  ON public.sync_idempotency_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Localiza conta de autenticação pelo e-mail, sem percorrer a primeira página.
CREATE OR REPLACE FUNCTION public.lookup_auth_user_id(p_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, public, pg_temp
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_auth_user_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id(text) TO service_role;
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
 IF EXISTS (SELECT 1 FROM public.sync_idempotency_keys WHERE user_id=auth.uid() AND operation_id=p_operation_id) THEN
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
 PERFORM public.record_sync_idempotency_key(auth.uid(), p_operation_id, p_table);
 PERFORM set_config('app.sync_internal', 'false', true);

 -- Gravação de idempotência permanente (sem payload)
 

 RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.apply_academic_mutation(text,text,jsonb,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_academic_mutation(text,text,jsonb,uuid) FROM anon;
