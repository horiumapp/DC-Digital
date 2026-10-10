-- Feriados da rede municipal. Um dia, um nome. Vale para todas as escolas.
-- Quem grava: ADMIN e GESTOR_SEMEC. Quem lê: qualquer usuário autenticado.

CREATE TABLE IF NOT EXISTS public.feriados_rede (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  data date NOT NULL UNIQUE,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feriados_rede ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feriados_rede_select ON public.feriados_rede;
CREATE POLICY feriados_rede_select ON public.feriados_rede
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS feriados_rede_insert ON public.feriados_rede;
CREATE POLICY feriados_rede_insert ON public.feriados_rede
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR_SEMEC'));

DROP POLICY IF EXISTS feriados_rede_update ON public.feriados_rede;
CREATE POLICY feriados_rede_update ON public.feriados_rede
  FOR UPDATE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR_SEMEC'))
  WITH CHECK ((SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR_SEMEC'));

DROP POLICY IF EXISTS feriados_rede_delete ON public.feriados_rede;
CREATE POLICY feriados_rede_delete ON public.feriados_rede
  FOR DELETE TO authenticated
  USING ((SELECT public.get_user_role()) IN ('ADMIN', 'GESTOR_SEMEC'));

REVOKE ALL ON TABLE public.feriados_rede FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feriados_rede TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.feriados_rede_id_seq TO authenticated;
