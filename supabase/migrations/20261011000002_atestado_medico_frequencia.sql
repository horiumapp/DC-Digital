-- Atestado médico lançado pela secretaria.
-- Justifica a falta (FJ) e prevalece sobre a chamada do professor.
-- Não abona a frequência: a ausência continua no cálculo da LDB.

CREATE TABLE IF NOT EXISTS public.atestados_medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid DEFAULT auth.uid(),
  CONSTRAINT atestado_periodo_valido CHECK (data_fim >= data_inicio)
);

CREATE INDEX IF NOT EXISTS idx_atestados_medicos_aluno_periodo
  ON public.atestados_medicos (aluno_id, data_inicio, data_fim);

ALTER TABLE public.atestados_medicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_atestado_medico" ON public.atestados_medicos;
CREATE POLICY "auth_select_atestado_medico" ON public.atestados_medicos
  FOR SELECT TO authenticated
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND escola_id = public.get_user_escola_id()
    )
    OR EXISTS (
      SELECT 1
      FROM public.alunos al
      WHERE al.id = atestados_medicos.aluno_id
        AND public.professor_tem_acesso_a_turma(al.turma_id)
    )
    OR public.aluno_e_o_proprio(atestados_medicos.aluno_id)
  );

DROP POLICY IF EXISTS "staff_insert_atestado_medico" ON public.atestados_medicos;
CREATE POLICY "staff_insert_atestado_medico" ON public.atestados_medicos
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.alunos al
      JOIN public.turmas t ON t.id = al.turma_id
      WHERE al.id = aluno_id
        AND t.escola_id = atestados_medicos.escola_id
    )
    AND (
      (SELECT public.get_user_role()) = 'ADMIN'
      OR public.usuario_tem_escopo_rede()
      OR (
        (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
        AND escola_id = public.get_user_escola_id()
      )
    )
  );

DROP POLICY IF EXISTS "staff_delete_atestado_medico" ON public.atestados_medicos;
CREATE POLICY "staff_delete_atestado_medico" ON public.atestados_medicos
  FOR DELETE TO authenticated
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND escola_id = public.get_user_escola_id()
    )
  );

REVOKE ALL ON public.atestados_medicos FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.atestados_medicos TO authenticated;

CREATE OR REPLACE FUNCTION public.aplicar_atestado_na_frequencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data ~ '^\d{4}-\d{2}-\d{2}$' AND EXISTS (
    SELECT 1
    FROM public.atestados_medicos a
    WHERE a.aluno_id = NEW.aluno_id
      AND NEW.data::date BETWEEN a.data_inicio AND a.data_fim
  ) THEN
    NEW.status := 'FJ';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS aplicar_atestado_na_frequencia_trg ON public.frequencias;
CREATE TRIGGER aplicar_atestado_na_frequencia_trg
  BEFORE INSERT OR UPDATE ON public.frequencias
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_atestado_na_frequencia();

CREATE OR REPLACE FUNCTION public.propagar_atestado_nas_frequencias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.frequencias f
  SET status = 'FJ'
  WHERE f.aluno_id = NEW.aluno_id
    AND f.data ~ '^\d{4}-\d{2}-\d{2}$'
    AND f.data::date BETWEEN NEW.data_inicio AND NEW.data_fim
    AND f.status IS DISTINCT FROM 'FJ';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS propagar_atestado_nas_frequencias_trg ON public.atestados_medicos;
CREATE TRIGGER propagar_atestado_nas_frequencias_trg
  AFTER INSERT ON public.atestados_medicos
  FOR EACH ROW EXECUTE FUNCTION public.propagar_atestado_nas_frequencias();
