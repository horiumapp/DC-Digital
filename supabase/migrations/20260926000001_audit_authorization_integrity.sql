-- Audit 2026-09-26: additive authorization and academic integrity fixes.
BEGIN;

-- Server-side revocation uses the institutional record, not stale JWT claims.
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT cargo FROM public.usuarios WHERE id = auth.uid()
$$;
CREATE OR REPLACE FUNCTION public.get_user_role_secure() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.get_user_role()
$$;

DROP POLICY IF EXISTS professor_pode_inserir_propria_frequencia ON public.frequencias;
DROP POLICY IF EXISTS professor_pode_editar_propria_frequencia ON public.frequencias;
DROP POLICY IF EXISTS professor_pode_deletar_propria_frequencia ON public.frequencias;
DROP POLICY IF EXISTS professor_pode_inserir_propria_nota ON public.notas;
DROP POLICY IF EXISTS professor_pode_editar_propria_nota ON public.notas;
DROP POLICY IF EXISTS professor_pode_deletar_propria_nota ON public.notas;
DROP POLICY IF EXISTS professor_pode_inserir_proprio_conteudo ON public.conteudos;
DROP POLICY IF EXISTS professor_pode_editar_proprio_conteudo ON public.conteudos;
DROP POLICY IF EXISTS professor_pode_deletar_proprio_conteudo ON public.conteudos;

CREATE OR REPLACE FUNCTION public.professor_tem_acesso_a_turma_disciplina(p_turma_id uuid,p_disciplina text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT public.get_user_role()='PROFESSOR' AND EXISTS (
    SELECT 1 FROM public.professor_horarios ph JOIN public.professores p ON p.id=ph.professor_id
    WHERE ph.turma_id=p_turma_id AND
      (p.usuario_id=auth.uid() OR (p.usuario_id IS NULL AND lower(p.email)=lower(auth.jwt()->>'email')))
      AND (upper(trim(ph.componente))=upper(trim(p_disciplina))
        OR upper(trim(ph.componente))='POLIVALENTE')
  )
$$;

CREATE OR REPLACE FUNCTION public.check_fechamento_transition() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_role text:=public.get_user_role(); v_turma uuid;
BEGIN
  v_turma := CASE WHEN TG_OP='DELETE' THEN OLD.turma_id ELSE NEW.turma_id END;
  -- Same lock as all academic mutations: serialize closing against a concurrent write.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_turma::text,0));
  IF TG_OP='UPDATE' AND OLD.turma_id<>NEW.turma_id THEN
    RAISE EXCEPTION 'Não é permitido mover um fechamento para outra turma';
  END IF;
  IF TG_OP<>'DELETE' AND NEW.status NOT IN ('ABERTO','FECHADO') THEN
    RAISE EXCEPTION 'Status de fechamento inválido';
  END IF;
  IF (TG_OP='DELETE' OR (TG_OP='UPDATE' AND
      (OLD.status='FECHADO' AND (NEW.status<>OLD.status OR NEW.bimestre<>OLD.bimestre OR NEW.disciplina<>OLD.disciplina))))
     AND NOT (coalesce(v_role='ADMIN',false) OR
       (coalesce(v_role IN ('GESTOR','SECRETARIO'),false) AND EXISTS
         (SELECT 1 FROM public.turmas WHERE id=v_turma AND escola_id=public.get_user_escola_id()))) THEN
    RAISE EXCEPTION 'Somente a administração da escola pode reabrir um período' USING ERRCODE='42501';
  END IF;
  IF TG_OP<>'DELETE' AND v_role='PROFESSOR' AND
     NOT public.professor_tem_acesso_a_turma_disciplina(NEW.turma_id,NEW.disciplina) THEN
    RAISE EXCEPTION 'Sem permissão para fechar esta disciplina' USING ERRCODE='42501';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER audit_fechamento_transition BEFORE INSERT OR UPDATE OR DELETE
ON public.fechamentos_bimestres FOR EACH ROW EXECUTE FUNCTION public.check_fechamento_transition();

CREATE OR REPLACE FUNCTION public.periodo_normalizado(p_periodo text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE
 WHEN upper(p_periodo) LIKE '%SEMESTRE%' THEN substring(p_periodo from '[1-2]')||'. SEMESTRE'
 WHEN p_periodo ~ '^[1-4]' THEN substring(p_periodo from '[1-4]')||'. BIMESTRE'
 WHEN upper(p_periodo) IN ('ÚNICO','PERÍODO ÚNICO') THEN 'ÚNICO'
 WHEN upper(p_periodo) LIKE 'RECUPERA%' THEN 'RECUPERAÇÃO'
 ELSE upper(trim(p_periodo)) END
$$;

-- Canonical calendar, with optional school overrides. Updates restricted to ADMIN.
CREATE TABLE IF NOT EXISTS public.periodos_letivos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), escola_id uuid REFERENCES public.escolas(id),
 ano integer NOT NULL, periodo text NOT NULL, data_inicio date NOT NULL, data_fim date NOT NULL,
 CHECK (data_inicio<=data_fim), UNIQUE NULLS NOT DISTINCT (escola_id,ano,periodo)
);
ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calendario_read ON public.periodos_letivos;
CREATE POLICY calendario_read ON public.periodos_letivos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS calendario_admin ON public.periodos_letivos;
CREATE POLICY calendario_admin ON public.periodos_letivos FOR ALL TO authenticated
USING (public.get_user_role()='ADMIN') WITH CHECK (public.get_user_role()='ADMIN');
GRANT SELECT,INSERT,UPDATE,DELETE ON public.periodos_letivos TO authenticated;
INSERT INTO public.periodos_letivos(ano,periodo,data_inicio,data_fim) VALUES
(2026,'1. BIMESTRE','2026-02-05','2026-04-23'),(2026,'2. BIMESTRE','2026-04-24','2026-07-07'),
(2026,'3. BIMESTRE','2026-07-16','2026-09-24'),(2026,'4. BIMESTRE','2026-09-25','2026-12-14'),
(2026,'1. SEMESTRE','2026-02-05','2026-07-07'),(2026,'2. SEMESTRE','2026-07-16','2026-12-14'),
(2026,'ÚNICO','2026-02-05','2026-12-14'),(2026,'RECUPERAÇÃO','2026-12-15','2026-12-23')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.assert_periodo_aberto(p_turma uuid,p_disciplina text,p_data text,p_periodo text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_escola uuid; v_ano integer;
BEGIN
  IF p_turma IS NULL THEN RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_turma::text,0));
  IF public.get_user_role()='ADMIN' THEN RETURN; END IF;
  SELECT escola_id,ano_letivo::integer INTO v_escola,v_ano FROM public.turmas WHERE id=p_turma;
  IF EXISTS (SELECT 1 FROM public.fechamentos_bimestres f
    WHERE f.turma_id=p_turma AND f.status='FECHADO'
      AND (upper(trim(f.disciplina))=upper(trim(p_disciplina)) OR upper(trim(f.disciplina)) IN ('TODAS','GERAL'))
      AND NOT EXISTS (SELECT 1 FROM public.periodos_letivos c WHERE c.ano=v_ano
        AND c.periodo=public.periodo_normalizado(f.bimestre) AND (c.escola_id IS NULL OR c.escola_id=v_escola))) THEN
    RAISE EXCEPTION 'Calendário do período fechado não configurado; solicite revisão administrativa';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fechamentos_bimestres f
    WHERE f.turma_id=p_turma AND f.status='FECHADO'
    AND (upper(trim(f.disciplina))=upper(trim(p_disciplina)) OR upper(trim(f.disciplina)) IN ('TODAS','GERAL'))
    AND (public.periodo_normalizado(f.bimestre)=public.periodo_normalizado(p_periodo)
      OR EXISTS (SELECT 1 FROM public.periodos_letivos c
        WHERE c.ano=v_ano AND c.periodo=public.periodo_normalizado(f.bimestre)
        AND (c.escola_id=v_escola OR (c.escola_id IS NULL AND NOT EXISTS (
          SELECT 1 FROM public.periodos_letivos x WHERE x.ano=c.ano AND x.periodo=c.periodo AND x.escola_id=v_escola)))
        AND p_data::date BETWEEN c.data_inicio AND c.data_fim))
  ) THEN RAISE EXCEPTION 'Período fechado: solicite reabertura antes de alterar dados acadêmicos' USING ERRCODE='P0001'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.assert_periodo_aberto(uuid,text,text,text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.guard_academic_period() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r jsonb; av public.avaliacoes%ROWTYPE;
BEGIN
  -- Check both sides of a move and DELETE, including cascade from an evaluation.
  FOR r IN SELECT value FROM jsonb_array_elements(CASE TG_OP
    WHEN 'INSERT' THEN jsonb_build_array(to_jsonb(NEW))
    WHEN 'DELETE' THEN jsonb_build_array(to_jsonb(OLD))
    ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END)
  LOOP
    IF TG_TABLE_NAME='notas' THEN
      SELECT * INTO av FROM public.avaliacoes WHERE id=(r->>'avaliacao_id')::bigint;
      IF FOUND THEN PERFORM public.assert_periodo_aberto(av.turma_id,av.disciplina,av.data,av.bimestre); END IF;
    ELSE
      PERFORM public.assert_periodo_aberto((r->>'turma_id')::uuid,r->>'disciplina',r->>'data',r->>'bimestre');
    END IF;
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS check_bimestre_frequencias_trigger ON public.frequencias;
DROP TRIGGER IF EXISTS check_bimestre_notas_trigger ON public.notas;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['frequencias','conteudos','avaliacoes','notas'] LOOP
  EXECUTE format('CREATE TRIGGER audit_period_guard BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_academic_period()',t);
 END LOOP;
END $$;

-- Validate a student's class at the academic date, retaining transfer history.
CREATE OR REPLACE FUNCTION public.aluno_na_turma(p_aluno uuid,p_turma uuid,p_data date) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_turma uuid; v_transfer public.aluno_transferencias%ROWTYPE;
BEGIN
 SELECT * INTO v_transfer FROM public.aluno_transferencias
 WHERE aluno_id=p_aluno AND status<>'CANCELADA' AND data_transferencia<=p_data
 ORDER BY data_transferencia DESC,created_at DESC LIMIT 1;
 IF FOUND THEN
  v_turma:=CASE WHEN v_transfer.status='RECEBIDA' THEN v_transfer.turma_destino_id ELSE NULL END;
 ELSE
  SELECT turma_origem_id INTO v_turma FROM public.aluno_transferencias
  WHERE aluno_id=p_aluno AND status<>'CANCELADA' ORDER BY data_transferencia,created_at LIMIT 1;
  IF NOT FOUND THEN SELECT turma_id INTO v_turma FROM public.alunos WHERE id=p_aluno; END IF;
 END IF;
 RETURN coalesce(v_turma=p_turma,false);
END $$;
CREATE OR REPLACE FUNCTION public.guard_academic_relationships() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE av public.avaliacoes%ROWTYPE; v_escola uuid;
BEGIN
 IF TG_TABLE_NAME='notas' THEN
  SELECT * INTO av FROM public.avaliacoes WHERE id=NEW.avaliacao_id;
  IF NOT FOUND OR NOT public.aluno_na_turma(NEW.aluno_id,av.turma_id,av.data::date) THEN
   RAISE EXCEPTION 'Aluno não matriculado na turma da avaliação na data informada' USING ERRCODE='23514'; END IF;
  IF NEW.valor<0 OR NEW.valor>av.valor_maximo OR NEW.valor::text IN ('NaN','Infinity','-Infinity') THEN
   RAISE EXCEPTION 'Nota fora do valor permitido para a avaliação' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='frequencias' THEN
  IF NOT public.aluno_na_turma(NEW.aluno_id,NEW.turma_id,NEW.data::date) THEN
   RAISE EXCEPTION 'Aluno não matriculado na turma da frequência na data informada' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME='avaliacoes' THEN
  IF NEW.valor_maximo IS NULL OR NEW.valor_maximo<=0 OR NEW.valor_maximo::text IN ('NaN','Infinity','-Infinity') THEN
   RAISE EXCEPTION 'Valor máximo inválido' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.notas WHERE avaliacao_id=NEW.id AND valor>NEW.valor_maximo) THEN
   RAISE EXCEPTION 'Existem notas acima do novo valor máximo' USING ERRCODE='23514'; END IF;
  IF NEW.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.avaliacoes p WHERE p.id=NEW.parent_id AND p.id<>NEW.id
       AND p.turma_id=NEW.turma_id AND p.disciplina=NEW.disciplina) THEN
   RAISE EXCEPTION 'Avaliação pai incompatível' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM public.avaliacoes child WHERE child.parent_id=NEW.id
      AND (child.turma_id IS DISTINCT FROM NEW.turma_id OR child.disciplina IS DISTINCT FROM NEW.disciplina)) THEN
   RAISE EXCEPTION 'Alteração invalidaria avaliações vinculadas' USING ERRCODE='23514'; END IF;
  IF NEW.parent_id IS NOT NULL AND EXISTS (WITH RECURSIVE ancestors AS (
    SELECT id,parent_id FROM public.avaliacoes WHERE id=NEW.parent_id
    UNION SELECT p.id,p.parent_id FROM public.avaliacoes p JOIN ancestors a ON p.id=a.parent_id
   ) SELECT 1 FROM ancestors WHERE id=NEW.id) THEN
   RAISE EXCEPTION 'Ciclo de avaliações não permitido' USING ERRCODE='23514'; END IF;
  IF TG_OP='UPDATE' AND (NEW.turma_id<>OLD.turma_id OR NEW.data<>OLD.data) AND EXISTS (
    SELECT 1 FROM public.notas n WHERE n.avaliacao_id=NEW.id AND NOT public.aluno_na_turma(n.aluno_id,NEW.turma_id,NEW.data::date)) THEN
   RAISE EXCEPTION 'Movimentação invalidaria matrículas das notas existentes' USING ERRCODE='23514'; END IF;
 ELSIF TG_TABLE_NAME IN ('alunos','professor_horarios') THEN
  IF NEW.turma_id IS NOT NULL THEN
   SELECT escola_id INTO v_escola FROM public.turmas WHERE id=NEW.turma_id;
   IF NEW.escola_id IS DISTINCT FROM v_escola THEN
    RAISE EXCEPTION 'Escola incompatível com a turma' USING ERRCODE='23514'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['notas','frequencias','avaliacoes','alunos','professor_horarios'] LOOP
  EXECUTE format('CREATE TRIGGER audit_relationship_guard BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_academic_relationships()',t);
 END LOOP;
END $$;

-- Serializes complete replacement of a teacher's schedule, including empty sets.
CREATE OR REPLACE FUNCTION public.lock_professor_schedule() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('schedule:'||coalesce(NEW.professor_id,OLD.professor_id)::text,0));
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER audit_schedule_lock BEFORE INSERT OR UPDATE OR DELETE ON public.professor_horarios
FOR EACH ROW EXECUTE FUNCTION public.lock_professor_schedule();

REVOKE ALL ON FUNCTION public.remanejar_aluno(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remanejar_aluno(uuid,uuid,text) TO authenticated;
COMMIT;
