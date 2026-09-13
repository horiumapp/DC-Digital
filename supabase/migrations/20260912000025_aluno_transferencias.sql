-- Transferência escolar segura: preserva o aluno e todo o histórico acadêmico.
CREATE TABLE IF NOT EXISTS public.aluno_transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE RESTRICT,
  escola_origem_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  turma_origem_id uuid REFERENCES public.turmas(id) ON DELETE RESTRICT,
  escola_destino_id uuid NOT NULL REFERENCES public.escolas(id) ON DELETE RESTRICT,
  turma_destino_id uuid NOT NULL REFERENCES public.turmas(id) ON DELETE RESTRICT,
  data_transferencia date NOT NULL DEFAULT current_date,
  motivo text,
  transferido_por uuid NOT NULL DEFAULT auth.uid() REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aluno_transferencias_destino_diferente CHECK (turma_origem_id IS NULL OR turma_origem_id <> turma_destino_id)
);
CREATE INDEX IF NOT EXISTS idx_aluno_transferencias_aluno_data ON public.aluno_transferencias(aluno_id, data_transferencia DESC);
ALTER TABLE public.aluno_transferencias ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.transferir_aluno(
  p_aluno_id uuid,
  p_turma_destino_id uuid,
  p_data_transferencia date DEFAULT current_date,
  p_motivo text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_aluno public.alunos%ROWTYPE;
  v_origem public.turmas%ROWTYPE;
  v_destino public.turmas%ROWTYPE;
  v_role text := public.get_user_role();
  v_serie_origem text;
  v_serie_destino text;
  v_transferencia_id uuid;
BEGIN
  IF v_role NOT IN ('ADMIN', 'SECRETARIO', 'GESTOR') THEN
    RAISE EXCEPTION 'Sem permissão para transferir alunos';
  END IF;
  SELECT * INTO v_aluno FROM public.alunos WHERE id = p_aluno_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Aluno não encontrado'; END IF;
  IF v_role IN ('GESTOR', 'SECRETARIO') AND v_aluno.escola_id <> public.get_user_escola_id() THEN
    RAISE EXCEPTION 'Gestor e Secretário só podem transferir alunos da própria escola de origem';
  END IF;
  SELECT * INTO v_origem FROM public.turmas WHERE id = v_aluno.turma_id;
  SELECT * INTO v_destino FROM public.turmas WHERE id = p_turma_destino_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Turma de destino não encontrada'; END IF;
  IF v_origem.id = v_destino.id THEN RAISE EXCEPTION 'A turma de destino deve ser diferente da turma atual'; END IF;
  IF v_role IN ('GESTOR', 'SECRETARIO') AND (v_destino.escola_id <> v_aluno.escola_id OR v_destino.escola_id <> public.get_user_escola_id()) THEN
    RAISE EXCEPTION 'Gestor e Secretário só podem remanejar alunos entre turmas da própria escola';
  END IF;
  IF v_origem.ano_letivo <> v_destino.ano_letivo THEN RAISE EXCEPTION 'A turma de destino deve pertencer ao mesmo ano letivo'; END IF;
  v_serie_origem := substring(v_origem.nome FROM '^\s*([0-9]+[º°ª]?)');
  v_serie_destino := substring(v_destino.nome FROM '^\s*([0-9]+[º°ª]?)');
  IF v_serie_origem IS NULL OR v_serie_origem <> v_serie_destino THEN
    RAISE EXCEPTION 'A turma de destino deve ser da mesma série da turma de origem';
  END IF;
  INSERT INTO public.aluno_transferencias(aluno_id, escola_origem_id, turma_origem_id, escola_destino_id, turma_destino_id, data_transferencia, motivo)
  VALUES (v_aluno.id, v_aluno.escola_id, v_aluno.turma_id, v_destino.escola_id, v_destino.id, COALESCE(p_data_transferencia, current_date), nullif(trim(p_motivo), ''))
  RETURNING id INTO v_transferencia_id;
  UPDATE public.alunos SET escola_id = v_destino.escola_id, turma_id = v_destino.id WHERE id = v_aluno.id;
  UPDATE public.usuarios SET escola_id = v_destino.escola_id
  WHERE v_aluno.cpf IS NOT NULL
    AND email = regexp_replace(v_aluno.cpf, '\D', '', 'g') || '@aluno.dcdigital.local';
  RETURN v_transferencia_id;
END;
$$;
REVOKE ALL ON FUNCTION public.transferir_aluno(uuid, uuid, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transferir_aluno(uuid, uuid, date, text) TO authenticated;

CREATE POLICY "transferencias_select_autorizado" ON public.aluno_transferencias FOR SELECT TO authenticated
USING (public.get_user_role() = 'ADMIN' OR (public.get_user_role() IN ('GESTOR', 'SECRETARIO') AND escola_origem_id = public.get_user_escola_id()));