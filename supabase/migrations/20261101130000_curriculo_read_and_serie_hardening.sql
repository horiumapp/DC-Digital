-- Follow-up de auditoria:
-- 1) Currículo: SELECT deixava qualquer autenticado (incl. ALUNO) ler tabelas completas.
--    Professores/gestão precisam ler no diário; ALUNO não.
-- 2) serie_da_turma: SECURITY DEFINER sem checagem de sessão/escopo e sem REVOKE.

-- -------------------------------------------------------------
-- Currículo — leitura só para papéis pedagógicos/administrativos
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura autenticados curriculo_habilidades" ON public.curriculo_habilidades;
CREATE POLICY "Leitura autenticados curriculo_habilidades" ON public.curriculo_habilidades
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) IN (
      'ADMIN', 'GESTOR', 'GESTOR_SEMEC', 'SECRETARIO', 'PROFESSOR'
    )
  );

DROP POLICY IF EXISTS "Leitura autenticados curriculo_objetos" ON public.curriculo_objetos;
CREATE POLICY "Leitura autenticados curriculo_objetos" ON public.curriculo_objetos
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) IN (
      'ADMIN', 'GESTOR', 'GESTOR_SEMEC', 'SECRETARIO', 'PROFESSOR'
    )
  );

DROP POLICY IF EXISTS "Leitura autenticados curriculo_unidades" ON public.curriculo_unidades;
CREATE POLICY "Leitura autenticados curriculo_unidades" ON public.curriculo_unidades
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated'
    AND (SELECT public.get_user_role()) IN (
      'ADMIN', 'GESTOR', 'GESTOR_SEMEC', 'SECRETARIO', 'PROFESSOR'
    )
  );

-- -------------------------------------------------------------
-- serie_da_turma — exige sessão e escopo na turma
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.serie_da_turma(p_turma_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN NOT (
      public.p_escola_permitida(t.escola_id)
      OR public.professor_tem_acesso_a_turma(t.id)
      OR public.aluno_tem_acesso_a_turma(t.id)
    ) THEN NULL
    ELSE substring(t.nome FROM '^\s*([0-9]+[º°ª]?)')
  END
  FROM public.turmas t
  WHERE t.id = p_turma_id;
$$;

REVOKE ALL ON FUNCTION public.serie_da_turma(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.serie_da_turma(uuid) TO authenticated;
