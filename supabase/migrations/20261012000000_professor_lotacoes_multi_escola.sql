-- O professor com mais de uma lotação precisa ler as próprias escolas,
-- não só a escola gravada em usuarios.escola_id.
-- Sem isso a tela de entrada só recebe uma lotação e entra direto.

CREATE OR REPLACE FUNCTION public.professor_e_o_proprio(p_professor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.professores p
    WHERE p.id = p_professor_id
      AND (
        (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
        OR (
          p.usuario_id IS NULL
          AND coalesce(auth.jwt() ->> 'email', '') <> ''
          AND lower(p.email) = lower(auth.jwt() ->> 'email')
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.professor_e_o_proprio(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.professor_e_o_proprio(uuid) TO authenticated;

DROP POLICY IF EXISTS "professor_select_proprias_alocacoes" ON public.professor_alocacoes;
CREATE POLICY "professor_select_proprias_alocacoes" ON public.professor_alocacoes
  FOR SELECT
  TO authenticated
  USING (public.professor_e_o_proprio(professor_id));

DROP POLICY IF EXISTS "professor_select_proprios_horarios" ON public.professor_horarios;
CREATE POLICY "professor_select_proprios_horarios" ON public.professor_horarios
  FOR SELECT
  TO authenticated
  USING (public.professor_e_o_proprio(professor_id));

DROP POLICY IF EXISTS "professor_select_escolas_da_lotacao" ON public.escolas;
CREATE POLICY "professor_select_escolas_da_lotacao" ON public.escolas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.professor_alocacoes pa
      WHERE pa.escola_id = escolas.id
        AND public.professor_e_o_proprio(pa.professor_id)
    )
  );

DROP POLICY IF EXISTS "professor_select_turmas_da_lotacao" ON public.turmas;
CREATE POLICY "professor_select_turmas_da_lotacao" ON public.turmas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.professor_alocacoes pa
      WHERE pa.escola_id = turmas.escola_id
        AND pa.turno = turmas.turno
        AND public.professor_e_o_proprio(pa.professor_id)
    )
  );
