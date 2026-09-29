-- Remanejamento interno e transferência entre escolas com recebimento pela escola de destino.
CREATE TABLE IF NOT EXISTS public.aluno_transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo text NOT NULL UNIQUE DEFAULT ('TRF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  escola_origem_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  turma_origem_id uuid REFERENCES public.turmas(id) ON DELETE RESTRICT,
  escola_destino_id uuid REFERENCES public.escolas(id) ON DELETE RESTRICT,
  turma_destino_id uuid REFERENCES public.turmas(id) ON DELETE RESTRICT,
  data_transferencia date NOT NULL DEFAULT current_date,
  motivo text,
  status text NOT NULL DEFAULT 'AGUARDANDO_RECEBIMENTO' CHECK (status IN ('AGUARDANDO_RECEBIMENTO','RECEBIDA','CANCELADA')),
  liberado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id),
  recebido_por uuid REFERENCES public.usuarios(id),
  recebido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transferencias_pendentes ON public.aluno_transferencias(status, protocolo);
ALTER TABLE public.aluno_transferencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos ALTER COLUMN escola_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.serie_da_turma(p_turma_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT substring(nome FROM '^\s*([0-9]+[º°ª]?)') FROM public.turmas WHERE id = p_turma_id
$$;

CREATE OR REPLACE FUNCTION public.liberar_transferencia_aluno(p_aluno_id uuid, p_motivo text DEFAULT NULL)
RETURNS TABLE(protocolo text, data_transferencia date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_aluno public.alunos%ROWTYPE; v_role text := public.get_user_role(); v_id uuid;
BEGIN
  IF v_role NOT IN ('ADMIN','SECRETARIO') THEN RAISE EXCEPTION 'Apenas Administrador ou Secretário podem liberar transferências entre escolas'; END IF;
  SELECT * INTO v_aluno FROM public.alunos WHERE id=p_aluno_id FOR UPDATE;
  IF NOT FOUND OR v_aluno.turma_id IS NULL THEN RAISE EXCEPTION 'Aluno sem matrícula ativa não pode ser transferido'; END IF;
  IF v_role='SECRETARIO' AND v_aluno.escola_id <> public.get_user_escola_id() THEN RAISE EXCEPTION 'O Secretário só pode liberar alunos da própria escola'; END IF;
  IF EXISTS (SELECT 1 FROM public.aluno_transferencias WHERE aluno_id=p_aluno_id AND status='AGUARDANDO_RECEBIMENTO') THEN RAISE EXCEPTION 'Já existe uma transferência aguardando recebimento para este aluno'; END IF;
  INSERT INTO public.aluno_transferencias(aluno_id, escola_origem_id, turma_origem_id, motivo)
  VALUES(v_aluno.id,v_aluno.escola_id,v_aluno.turma_id,nullif(trim(p_motivo),'')) RETURNING id INTO v_id;
  UPDATE public.alunos SET escola_id=NULL,turma_id=NULL,status='Aguardando transferência' WHERE id=v_aluno.id;
  UPDATE public.usuarios SET escola_id=NULL WHERE v_aluno.cpf IS NOT NULL AND email=regexp_replace(v_aluno.cpf,'\D','','g') || '@aluno.dcdigital.local';
  RETURN QUERY SELECT t.protocolo,t.data_transferencia FROM public.aluno_transferencias t WHERE t.id=v_id;
END $$;

CREATE OR REPLACE FUNCTION public.receber_transferencia_aluno(p_protocolo text,p_matricula text,p_data_nascimento date,p_turma_destino_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_t public.aluno_transferencias%ROWTYPE; v_aluno public.alunos%ROWTYPE; v_origem public.turmas%ROWTYPE; v_destino public.turmas%ROWTYPE; v_role text:=public.get_user_role();
BEGIN
  IF v_role NOT IN ('ADMIN','SECRETARIO') THEN RAISE EXCEPTION 'Apenas Administrador ou Secretário podem receber transferências'; END IF;
  SELECT * INTO v_t FROM public.aluno_transferencias WHERE protocolo=upper(trim(p_protocolo)) AND status='AGUARDANDO_RECEBIMENTO' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência pendente não encontrada'; END IF;
  SELECT * INTO v_aluno FROM public.alunos WHERE id=v_t.aluno_id FOR UPDATE;
  IF v_aluno.matricula <> trim(p_matricula) OR v_aluno.data_nascimento <> p_data_nascimento THEN RAISE EXCEPTION 'Matrícula ou data de nascimento não conferem'; END IF;
  SELECT * INTO v_origem FROM public.turmas WHERE id=v_t.turma_origem_id; SELECT * INTO v_destino FROM public.turmas WHERE id=p_turma_destino_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turma de destino não encontrada'; END IF;
  IF v_role='SECRETARIO' AND v_destino.escola_id <> public.get_user_escola_id() THEN RAISE EXCEPTION 'O Secretário só pode receber alunos em sua própria escola'; END IF;
  IF v_origem.ano_letivo <> v_destino.ano_letivo OR public.serie_da_turma(v_origem.id) IS NULL OR public.serie_da_turma(v_origem.id) <> public.serie_da_turma(v_destino.id) THEN RAISE EXCEPTION 'A turma de destino deve ter a mesma série e ano letivo'; END IF;
  UPDATE public.alunos SET escola_id=v_destino.escola_id,turma_id=v_destino.id,status='Ativo' WHERE id=v_aluno.id;
  UPDATE public.usuarios SET escola_id=v_destino.escola_id WHERE v_aluno.cpf IS NOT NULL AND email=regexp_replace(v_aluno.cpf,'\D','','g') || '@aluno.dcdigital.local';
  UPDATE public.aluno_transferencias SET escola_destino_id=v_destino.escola_id,turma_destino_id=v_destino.id,status='RECEBIDA',recebido_por=auth.uid(),recebido_em=now() WHERE id=v_t.id;
  RETURN v_t.id;
END $$;


CREATE OR REPLACE FUNCTION public.remanejar_aluno(p_aluno_id uuid, p_turma_destino_id uuid, p_motivo text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_aluno public.alunos%ROWTYPE; v_origem public.turmas%ROWTYPE; v_destino public.turmas%ROWTYPE; v_role text:=public.get_user_role(); v_id uuid;
BEGIN
  IF v_role NOT IN ('ADMIN','GESTOR','SECRETARIO') THEN RAISE EXCEPTION 'Sem permissão para remanejar alunos'; END IF;
  SELECT * INTO v_aluno FROM public.alunos WHERE id=p_aluno_id FOR UPDATE; IF NOT FOUND OR v_aluno.turma_id IS NULL THEN RAISE EXCEPTION 'Aluno sem matrícula ativa'; END IF;
  SELECT * INTO v_origem FROM public.turmas WHERE id=v_aluno.turma_id; SELECT * INTO v_destino FROM public.turmas WHERE id=p_turma_destino_id;
  IF NOT FOUND OR v_origem.id=v_destino.id THEN RAISE EXCEPTION 'Selecione uma turma de destino diferente'; END IF;
  IF v_role IN ('GESTOR','SECRETARIO') AND v_origem.escola_id <> public.get_user_escola_id() THEN RAISE EXCEPTION 'Você só pode remanejar alunos da própria escola'; END IF;
  IF v_origem.escola_id <> v_destino.escola_id OR v_origem.ano_letivo <> v_destino.ano_letivo OR public.serie_da_turma(v_origem.id) IS NULL OR public.serie_da_turma(v_origem.id) <> public.serie_da_turma(v_destino.id) THEN RAISE EXCEPTION 'O remanejamento exige turma da mesma escola, série e ano letivo'; END IF;
  INSERT INTO public.aluno_transferencias(aluno_id,escola_origem_id,turma_origem_id,escola_destino_id,turma_destino_id,data_transferencia,motivo,status)
  VALUES(v_aluno.id,v_origem.escola_id,v_origem.id,v_destino.escola_id,v_destino.id,current_date,nullif(trim(p_motivo),''),'RECEBIDA') RETURNING id INTO v_id;
  UPDATE public.alunos SET turma_id=v_destino.id WHERE id=v_aluno.id; RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.remanejar_aluno(uuid,uuid,text) TO authenticated;
CREATE POLICY "transferencias_historico" ON public.aluno_transferencias FOR SELECT TO authenticated USING (
  public.get_user_role()='ADMIN' OR (public.get_user_role()='SECRETARIO' AND (escola_origem_id=public.get_user_escola_id() OR escola_destino_id=public.get_user_escola_id()))
);
REVOKE ALL ON FUNCTION public.liberar_transferencia_aluno(uuid,text), public.receber_transferencia_aluno(text,text,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.liberar_transferencia_aluno(uuid,text), public.receber_transferencia_aluno(text,text,date,uuid) TO authenticated;