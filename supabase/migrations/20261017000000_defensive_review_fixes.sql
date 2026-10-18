-- Revisão defensiva: cargo do gestor alinhado à função de criação de contas,
-- escola obrigatória na alteração de usuário e observação de atestado
-- restrita a quem cuida do aluno na escola.

CREATE OR REPLACE FUNCTION public.p_cargo_compativel(p_cargo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      (SELECT public.get_user_role()) = 'GESTOR_SEMEC'
      AND p_cargo IN ('GESTOR', 'SECRETARIO', 'PROFESSOR', 'ALUNO')
    )
    OR (
      (SELECT public.get_user_role()) = 'GESTOR'
      AND p_cargo IN ('PROFESSOR', 'ALUNO')
    )
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND p_cargo IN ('PROFESSOR', 'ALUNO')
    )
    OR (
      (SELECT public.get_user_role()) = 'PROFESSOR'
      AND p_cargo = 'PROFESSOR'
    );
$$;

DROP POLICY IF EXISTS "admin_update_usuarios" ON public.usuarios;
CREATE POLICY "admin_update_usuarios" ON public.usuarios
  FOR UPDATE
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND id <> auth.uid()
      AND escola_id = public.get_user_escola_id()
    )
  )
  WITH CHECK (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR (
      public.is_admin_or_staff()
      AND id <> auth.uid()
      AND escola_id = public.get_user_escola_id()
      AND public.p_cargo_compativel(cargo)
    )
  );

REVOKE SELECT ON public.atestados_medicos FROM authenticated;
GRANT SELECT (
  id, aluno_id, escola_id, data_inicio, data_fim, criado_em, usuario_id
) ON public.atestados_medicos TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_atestados_do_aluno(p_aluno_id uuid)
RETURNS TABLE (
  id uuid,
  aluno_id uuid,
  escola_id uuid,
  data_inicio date,
  data_fim date,
  observacao text,
  criado_em timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    a.id,
    a.aluno_id,
    a.escola_id,
    a.data_inicio,
    a.data_fim,
    CASE
      WHEN (SELECT public.get_user_role()) = 'ADMIN'
        OR public.usuario_tem_escopo_rede()
        OR (
          (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
          AND a.escola_id = public.get_user_escola_id()
        )
        OR public.aluno_e_o_proprio(a.aluno_id)
      THEN a.observacao
      ELSE NULL
    END,
    a.criado_em
  FROM public.atestados_medicos a
  WHERE a.aluno_id = p_aluno_id
    AND (
      (SELECT public.get_user_role()) = 'ADMIN'
      OR public.usuario_tem_escopo_rede()
      OR (
        (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
        AND a.escola_id = public.get_user_escola_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public.alunos al
        WHERE al.id = a.aluno_id
          AND public.professor_tem_acesso_a_turma(al.turma_id)
      )
      OR public.aluno_e_o_proprio(a.aluno_id)
    );
$$;

REVOKE ALL ON FUNCTION public.listar_atestados_do_aluno(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_atestados_do_aluno(uuid) TO authenticated;
