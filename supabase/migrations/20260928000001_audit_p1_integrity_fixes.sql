-- =============================================================
-- Migration: 20260928000001_audit_p1_integrity_fixes.sql
-- Auditoria de Integridade e Autorização P1/P2
-- 1. Desvinculação atômica de professor por escola via RPC transacional
-- 2. Revogação de inserção direta em lgpd_requests e rate limit atômico com lock
-- 3. Índices únicos para CPF limpo e matrícula em alunos
-- 4. Inclusão de SECRETARIO nas políticas RLS de currículo
-- 5. Allowlist estrita em get_aluno_numero_chamada
-- 6. Hardening de funções SECURITY DEFINER (revogação de privilégios de PUBLIC)
-- 7. Proteção de escrita em sync_receipts (somente via mutação interna)
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. RPC transacional: desvincular_professor_escola
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.desvincular_professor_escola(
  p_professor_id uuid,
  p_escola_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role text := public.get_user_role();
  v_escola_id uuid := public.get_user_escola_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  -- Validação de autorização: ADMIN ou GESTOR/SECRETARIO da mesma escola
  IF v_role = 'ADMIN' THEN
    NULL;
  ELSIF v_role IN ('GESTOR', 'SECRETARIO') THEN
    IF p_escola_id IS DISTINCT FROM v_escola_id THEN
      RAISE EXCEPTION 'Permissão negada: você só pode desvincular professores da sua própria escola' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Permissão negada para desvincular professor' USING ERRCODE = '42501';
  END IF;

  -- Lock no horário do professor para serializar alterações de grade
  PERFORM pg_advisory_xact_lock(hashtextextended('schedule:' || p_professor_id::text, 0));

  -- 1. Remover horários vinculados a esta escola
  DELETE FROM public.professor_horarios
  WHERE professor_id = p_professor_id AND escola_id = p_escola_id;

  -- 2. Remover alocação vinculada a esta escola
  DELETE FROM public.professor_alocacoes
  WHERE professor_id = p_professor_id AND escola_id = p_escola_id;
END;
$$;

REVOKE ALL ON FUNCTION public.desvincular_professor_escola(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.desvincular_professor_escola(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.desvincular_professor_escola(uuid, uuid) TO authenticated;

-- -------------------------------------------------------------
-- 2. Revogação de INSERT direto em lgpd_requests e rate limit atômico
-- -------------------------------------------------------------
REVOKE INSERT ON public.lgpd_requests FROM anon, authenticated, PUBLIC;
DROP POLICY IF EXISTS "Allow public insert for lgpd_requests" ON public.lgpd_requests;

-- Lock transacional no trigger de rate limit de lgpd_requests para evitar race condition
CREATE OR REPLACE FUNCTION public.check_lgpd_rate_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  recent_count INTEGER;
  window_start TIMESTAMPTZ := NOW() - INTERVAL '15 minutes';
  v_email text;
BEGIN
  v_email := LOWER(TRIM(NEW.email));

  -- Serializa verificações concorrentes para o mesmo email
  PERFORM pg_advisory_xact_lock(hashtextextended('lgpd_rate_limit:' || v_email, 0));

  SELECT COUNT(*) INTO recent_count
  FROM public.lgpd_requests
  WHERE email = v_email
    AND created_at >= window_start;

  IF recent_count >= 5 THEN
    RAISE EXCEPTION
      'RATE_LIMIT_EXCEEDED: Muitas solicitações LGPD do email na última hora. Aguarde 15 minutos.'
      USING
        ERRCODE = 'P0001',
        DETAIL = format('Email: %s, Solicitações recentes: %s', v_email, recent_count);
  END IF;

  NEW.email := v_email;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.check_lgpd_rate_limit() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_lgpd_rate_limit() FROM anon, authenticated;

-- -------------------------------------------------------------
-- 3. Unicidade de CPF limpo e matrícula em alunos
-- -------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_alunos_cpf_limpo
  ON public.alunos (regexp_replace(cpf, '\D', '', 'g'))
  WHERE cpf IS NOT NULL AND regexp_replace(cpf, '\D', '', 'g') <> '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_alunos_escola_matricula
  ON public.alunos (escola_id, trim(matricula))
  WHERE matricula IS NOT NULL AND trim(matricula) <> '';

-- -------------------------------------------------------------
-- 4. Alinhamento de RLS de currículo com SECRETARIO
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Admin gerencia curriculo_unidades" ON public.curriculo_unidades;
CREATE POLICY "Admin gerencia curriculo_unidades" ON public.curriculo_unidades
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text, 'SECRETARIO'::text])
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text, 'SECRETARIO'::text])
  );

DROP POLICY IF EXISTS "Admin gerencia curriculo_objetos" ON public.curriculo_objetos;
CREATE POLICY "Admin gerencia curriculo_objetos" ON public.curriculo_objetos
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text, 'SECRETARIO'::text])
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text, 'SECRETARIO'::text])
  );

DROP POLICY IF EXISTS "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades;
CREATE POLICY "Admin gerencia curriculo_habilidades" ON public.curriculo_habilidades
  FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text, 'SECRETARIO'::text])
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) = ANY (ARRAY['ADMIN'::text, 'GESTOR'::text, 'SECRETARIO'::text])
  );

-- -------------------------------------------------------------
-- 5. Allowlist estrita em get_aluno_numero_chamada
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_aluno_numero_chamada(p_aluno_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_turma_id uuid;
  v_escola_id uuid;
  v_pos integer;
  v_role text := public.get_user_role();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão necessária' USING ERRCODE = '42501';
  END IF;

  SELECT turma_id, escola_id INTO v_turma_id, v_escola_id FROM public.alunos WHERE id = p_aluno_id;
  IF v_turma_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Allowlist de autorização por papel
  IF v_role = 'ADMIN' THEN
    NULL;
  ELSIF v_role IN ('GESTOR', 'SECRETARIO') THEN
    IF v_escola_id IS DISTINCT FROM public.get_user_escola_id() THEN
      RAISE EXCEPTION 'Acesso negado: aluno de outra escola' USING ERRCODE = '42501';
    END IF;
  ELSIF v_role = 'PROFESSOR' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.professor_horarios ph
      JOIN public.professores p ON p.id = ph.professor_id
      WHERE ph.turma_id = v_turma_id
        AND (p.usuario_id = auth.uid() OR (p.usuario_id IS NULL AND lower(p.email) = lower(auth.jwt() ->> 'email')))
    ) THEN
      RAISE EXCEPTION 'Acesso negado: professor não alocado nesta turma' USING ERRCODE = '42501';
    END IF;
  ELSIF v_role = 'ALUNO' THEN
    IF NOT (
      public.aluno_e_o_proprio(p_aluno_id)
      OR EXISTS (
        SELECT 1 FROM public.alunos
        WHERE id = p_aluno_id
          AND (
            usuario_id = auth.uid()
            OR (
              cpf IS NOT NULL
              AND auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
              AND regexp_replace(cpf, '\D', '', 'g') = split_part(auth.jwt() ->> 'email', '@', 1)
            )
          )
      )
    ) THEN
      RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;
  ELSE
    -- PENDENTE ou outros papéis não institucionais
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  WITH ordem AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY nome ASC) as num
    FROM public.alunos
    WHERE turma_id = v_turma_id
  )
  SELECT num INTO v_pos FROM ordem WHERE id = p_aluno_id;

  RETURN coalesce(v_pos, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_aluno_numero_chamada(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_aluno_numero_chamada(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_aluno_numero_chamada(uuid) TO authenticated;

-- -------------------------------------------------------------
-- 6. Hardening de funções SECURITY DEFINER (revogação de PUBLIC)
-- -------------------------------------------------------------
REVOKE ALL ON FUNCTION public.aluno_na_turma(uuid, uuid, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aluno_na_turma(uuid, uuid, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.aluno_na_turma(uuid, uuid, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_secretario_escola(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_secretario_escola(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_secretario_escola(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_diretor_escola(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_diretor_escola(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_diretor_escola(uuid) TO authenticated, service_role;

-- -------------------------------------------------------------
-- 7. Proteção de escrita em sync_receipts (apenas via RPC interna)
-- -------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.sync_receipts FROM authenticated, anon, PUBLIC;
DROP POLICY IF EXISTS own_receipt_insert ON public.sync_receipts;

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

-- Atualizar apply_academic_mutation para gravar recibos pela função SECURITY DEFINER interna
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

REVOKE ALL ON FUNCTION public.apply_academic_mutation(text,text,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_academic_mutation(text,text,jsonb,uuid) TO authenticated;

COMMIT;
