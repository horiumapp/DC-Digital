-- Isola a leitura de GESTOR na própria escola.
-- escola_id nulo deixa de significar visão da rede.
-- Gestores que já estavam sem escola (marcador antigo da SME) recebem escopo_rede.
-- Diretor e secretário deixam de ser consultáveis por anônimo.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS escopo_rede boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.usuarios.escopo_rede IS
  'Quando verdadeiro e o cargo é GESTOR, autoriza leitura de toda a rede. escola_id nulo não concede esse acesso.';

UPDATE public.usuarios
SET escopo_rede = true
WHERE cargo = 'GESTOR'
  AND escola_id IS NULL
  AND escopo_rede = false;

CREATE OR REPLACE FUNCTION public.usuario_tem_escopo_rede()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios
    WHERE id = auth.uid()
      AND cargo = 'GESTOR'
      AND escopo_rede = true
  );
$$;

REVOKE ALL ON FUNCTION public.usuario_tem_escopo_rede() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.usuario_tem_escopo_rede() TO authenticated;

CREATE OR REPLACE FUNCTION public.pode_ver_equipe_escola(p_escola_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p_escola_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND (
      (SELECT public.get_user_role()) = 'ADMIN'
      OR public.usuario_tem_escopo_rede()
      OR p_escola_id = public.get_user_escola_id()
      OR EXISTS (
        SELECT 1
        FROM public.alunos a
        WHERE a.escola_id = p_escola_id
          AND (
            (a.usuario_id IS NOT NULL AND a.usuario_id = auth.uid())
            OR a.id = auth.uid()
            OR (
              a.cpf IS NOT NULL
              AND auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
              AND regexp_replace(a.cpf, '\D', '', 'g') = split_part(auth.jwt() ->> 'email', '@', 1)
            )
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.professor_alocacoes pa
        JOIN public.professores p ON p.id = pa.professor_id
        WHERE pa.escola_id = p_escola_id
          AND (
            (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
            OR (p.usuario_id IS NULL AND lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
          )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.pode_ver_equipe_escola(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pode_ver_equipe_escola(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.p_escola_permitida(p_escola_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND p_escola_id IS NOT NULL
      AND p_escola_id = public.get_user_escola_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.p_acesso_por_turma(p_turma_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) = 'GESTOR'
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = p_turma_id AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR (
      (SELECT public.get_user_role()) = 'SECRETARIO'
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = p_turma_id AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma(p_turma_id)
    OR public.aluno_tem_acesso_a_turma(p_turma_id);
$$;

DROP POLICY IF EXISTS "auth_select_frequencias" ON public.frequencias;
CREATE POLICY "auth_select_frequencias" ON public.frequencias
  FOR SELECT
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND EXISTS (
        SELECT 1 FROM public.turmas t
        WHERE t.id = frequencias.turma_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR public.professor_tem_acesso_a_turma(frequencias.turma_id)
    OR public.aluno_e_o_proprio(frequencias.aluno_id)
  );

DROP POLICY IF EXISTS "auth_select_notas" ON public.notas;
CREATE POLICY "auth_select_notas" ON public.notas
  FOR SELECT
  USING (
    (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND EXISTS (
        SELECT 1
        FROM public.avaliacoes av
        JOIN public.turmas t ON t.id = av.turma_id
        WHERE av.id = notas.avaliacao_id
          AND t.escola_id = public.get_user_escola_id()
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.avaliacoes av
      WHERE av.id = notas.avaliacao_id
        AND public.professor_tem_acesso_a_turma(av.turma_id)
    )
    OR public.aluno_e_o_proprio(notas.aluno_id)
  );

DROP POLICY IF EXISTS "auth_select_usuarios" ON public.usuarios;
CREATE POLICY "auth_select_usuarios" ON public.usuarios
  FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT public.get_user_role()) = 'ADMIN'
    OR public.usuario_tem_escopo_rede()
    OR (
      (SELECT public.get_user_role()) IN ('GESTOR', 'SECRETARIO')
      AND escola_id IS NOT NULL
      AND escola_id = public.get_user_escola_id()
    )
    OR (
      cargo IN ('GESTOR', 'SECRETARIO')
      AND public.pode_ver_equipe_escola(escola_id)
    )
  );

CREATE OR REPLACE FUNCTION public.get_secretario_escola(p_escola_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nome text;
BEGIN
  IF NOT public.pode_ver_equipe_escola(p_escola_id) THEN
    RETURN '';
  END IF;

  SELECT trim(nome_completo) INTO v_nome
  FROM public.usuarios
  WHERE escola_id = p_escola_id
    AND cargo = 'SECRETARIO'
    AND nome_completo IS NOT NULL
    AND trim(nome_completo) <> ''
    AND lower(trim(nome_completo)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_nome IS NOT NULL AND v_nome <> '' THEN
    RETURN v_nome;
  END IF;

  SELECT trim(secretario) INTO v_nome
  FROM public.escolas
  WHERE id = p_escola_id
    AND secretario IS NOT NULL
    AND trim(secretario) <> ''
    AND lower(trim(secretario)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  LIMIT 1;

  RETURN COALESCE(v_nome, '');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_diretor_escola(p_escola_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_nome text;
BEGIN
  IF NOT public.pode_ver_equipe_escola(p_escola_id) THEN
    RETURN '';
  END IF;

  SELECT trim(nome_completo) INTO v_nome
  FROM public.usuarios
  WHERE escola_id = p_escola_id
    AND cargo = 'GESTOR'
    AND nome_completo IS NOT NULL
    AND trim(nome_completo) <> ''
    AND lower(trim(nome_completo)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  ORDER BY criado_em ASC
  LIMIT 1;

  IF v_nome IS NOT NULL AND v_nome <> '' THEN
    RETURN v_nome;
  END IF;

  SELECT trim(diretor) INTO v_nome
  FROM public.escolas
  WHERE id = p_escola_id
    AND diretor IS NOT NULL
    AND trim(diretor) <> ''
    AND lower(trim(diretor)) NOT IN (
      'não localizado', 'nao localizado', 'não informado', 'nao informado',
      'não cadastrado', 'nao cadastrado', 'n/d', 'nd', '---', '--', '-'
    )
  LIMIT 1;

  RETURN COALESCE(v_nome, '');
END;
$$;

REVOKE ALL ON FUNCTION public.get_secretario_escola(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_diretor_escola(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_secretario_escola(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_diretor_escola(uuid) TO authenticated, service_role;
