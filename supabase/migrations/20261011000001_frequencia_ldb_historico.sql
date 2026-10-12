-- Histórico de frequência e decisões de fechamento.
-- A regra de cálculo fica na aplicação (LDB, arts. 24 e 31).
-- Este registro não abona falta: justificativa continua sendo falta
-- até a escola validar uma situação especial.

CREATE TABLE IF NOT EXISTS public.frequencia_historico (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  frequencia_id bigint,
  turma_id uuid NOT NULL,
  aluno_id uuid NOT NULL,
  data text NOT NULL,
  tempo text NOT NULL,
  disciplina text NOT NULL,
  status_anterior text,
  status_novo text,
  participacao_anterior text,
  participacao_nova text,
  operacao text NOT NULL,
  alterado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_frequencia_historico_aluno
  ON public.frequencia_historico (turma_id, aluno_id, data, tempo, disciplina, alterado_em DESC);

ALTER TABLE public.frequencia_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_frequencia_historico" ON public.frequencia_historico;
CREATE POLICY "auth_select_frequencia_historico" ON public.frequencia_historico
  FOR SELECT TO authenticated
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencia_historico.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(frequencia_historico.turma_id, frequencia_historico.disciplina)
    OR public.aluno_e_o_proprio(frequencia_historico.aluno_id)
  );

REVOKE ALL ON public.frequencia_historico FROM PUBLIC, anon;
GRANT SELECT ON public.frequencia_historico TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_frequencia_historico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.frequencia_historico (
      frequencia_id, turma_id, aluno_id, data, tempo, disciplina,
      status_anterior, status_novo, participacao_anterior, participacao_nova, operacao
    ) VALUES (
      NEW.id, NEW.turma_id, NEW.aluno_id, NEW.data, NEW.tempo, NEW.disciplina,
      NULL, NEW.status, NULL, NEW.participacao, 'INSERT'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.participacao IS DISTINCT FROM OLD.participacao THEN
      INSERT INTO public.frequencia_historico (
        frequencia_id, turma_id, aluno_id, data, tempo, disciplina,
        status_anterior, status_novo, participacao_anterior, participacao_nova, operacao
      ) VALUES (
        NEW.id, NEW.turma_id, NEW.aluno_id, NEW.data, NEW.tempo, NEW.disciplina,
        OLD.status, NEW.status, OLD.participacao, NEW.participacao, 'UPDATE'
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.frequencia_historico (
      frequencia_id, turma_id, aluno_id, data, tempo, disciplina,
      status_anterior, status_novo, participacao_anterior, participacao_nova, operacao
    ) VALUES (
      OLD.id, OLD.turma_id, OLD.aluno_id, OLD.data, OLD.tempo, OLD.disciplina,
      OLD.status, NULL, OLD.participacao, NULL, 'DELETE'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS frequencia_historico_trg ON public.frequencias;
CREATE TRIGGER frequencia_historico_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.frequencias
  FOR EACH ROW EXECUTE FUNCTION public.trg_frequencia_historico();

CREATE TABLE IF NOT EXISTS public.decisoes_fechamento_frequencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id uuid NOT NULL,
  aluno_id uuid NOT NULL,
  disciplina text NOT NULL,
  periodo text NOT NULL,
  etapa text NOT NULL,
  momento text NOT NULL,
  carga_frequentada numeric NOT NULL,
  carga_faltas numeric NOT NULL,
  carga_letiva_total numeric NOT NULL,
  frequencia_percentual numeric,
  ausencia_percentual numeric,
  resultado text NOT NULL,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  usuario_id uuid DEFAULT auth.uid()
);

CREATE INDEX IF NOT EXISTS idx_decisoes_fechamento_frequencia_aluno
  ON public.decisoes_fechamento_frequencia (turma_id, aluno_id, periodo, criado_em DESC);

ALTER TABLE public.decisoes_fechamento_frequencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_decisao_frequencia" ON public.decisoes_fechamento_frequencia;
CREATE POLICY "auth_select_decisao_frequencia" ON public.decisoes_fechamento_frequencia
  FOR SELECT TO authenticated
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = decisoes_fechamento_frequencia.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma_disciplina(decisoes_fechamento_frequencia.turma_id, decisoes_fechamento_frequencia.disciplina)
    OR public.aluno_e_o_proprio(decisoes_fechamento_frequencia.aluno_id)
  );

DROP POLICY IF EXISTS "staff_insert_decisao_frequencia" ON public.decisoes_fechamento_frequencia;
CREATE POLICY "staff_insert_decisao_frequencia" ON public.decisoes_fechamento_frequencia
  FOR INSERT TO authenticated
  WITH CHECK (
    usuario_id = auth.uid()
    AND (
      (SELECT public.get_user_role()) = 'ADMIN'
      OR public.usuario_tem_escopo_rede()
      OR (
        (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
        AND EXISTS (
          SELECT 1 FROM public.turmas t
          WHERE t.id = turma_id
            AND t.escola_id = public.get_user_escola_id()
        )
      )
    )
  );

REVOKE ALL ON public.decisoes_fechamento_frequencia FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.decisoes_fechamento_frequencia TO authenticated;
