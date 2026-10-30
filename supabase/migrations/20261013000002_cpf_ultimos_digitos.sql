-- A escola vê só os três últimos dígitos do CPF do professor.
-- O número completo continua com o administrador e com o próprio docente.

CREATE OR REPLACE FUNCTION public.cpfs_de_professores(p_ids uuid[])
RETURNS TABLE (id uuid, cpf text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p.id,
    CASE
      WHEN (SELECT public.get_user_role()) = 'ADMIN'
        OR public.professor_e_o_proprio(p.id)
        THEN p.cpf
      WHEN length(regexp_replace(coalesce(p.cpf, ''), '\D', '', 'g')) >= 3
        THEN right(regexp_replace(p.cpf, '\D', '', 'g'), 3)
      ELSE NULL
    END
  FROM public.professores p
  WHERE p.id = ANY(coalesce(p_ids, ARRAY[]::uuid[]))
    AND (
      (SELECT public.get_user_role()) = 'ADMIN'
      OR public.usuario_tem_escopo_rede()
      OR (SELECT public.get_user_role()) = 'GESTOR_SEMEC'
      OR (
        (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
        AND EXISTS (
          SELECT 1
          FROM public.professor_alocacoes pa
          WHERE pa.professor_id = p.id
            AND public.p_escola_permitida(pa.escola_id)
        )
      )
      OR public.professor_e_o_proprio(p.id)
    );
$$;

REVOKE ALL ON FUNCTION public.cpfs_de_professores(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cpfs_de_professores(uuid[]) TO authenticated;
