-- =============================================================
-- Migration: 20260927000001_audit_hardening_fixes.sql
-- Auditoria de Hardening e Integridade (27/09/2026)
-- 1. RPC segura para número de chamada do aluno (sem vazar dados de colegas sob RLS)
-- 2. RPC transacional atômica para objetos curriculares
-- 3. Revogação de privilégios anônimos desnecessários
-- =============================================================

BEGIN;

-- 1. Helper seguro para cálculo do número de chamada do aluno
CREATE OR REPLACE FUNCTION public.get_aluno_numero_chamada(p_aluno_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_turma_id uuid;
  v_pos integer;
BEGIN
  SELECT turma_id INTO v_turma_id FROM public.alunos WHERE id = p_aluno_id;
  IF v_turma_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Validação de acesso para perfil ALUNO: só consulta o próprio número
  IF public.get_user_role() = 'ALUNO' THEN
    IF NOT (
      public.aluno_e_o_proprio(p_aluno_id)
      OR EXISTS (
        SELECT 1 FROM public.alunos
        WHERE id = p_aluno_id
          AND (
            usuario_id = auth.uid()
            OR (
              cpf IS NOT NULL
              AND auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
              AND regexp_replace(cpf, '\D', '', 'g') = split_part(auth.jwt() ->> 'email', '@', 1)
            )
          )
      )
    ) THEN
      RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
    END IF;
  END IF;

  WITH ordem AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY nome ASC) as num
    FROM public.alunos
    WHERE turma_id = v_turma_id
  )
  SELECT num INTO v_pos FROM ordem WHERE id = p_aluno_id;

  RETURN coalesce(v_pos, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_aluno_numero_chamada(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_aluno_numero_chamada(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_aluno_numero_chamada(uuid) TO authenticated;

-- 2. RPC transacional atômica para objetos de conhecimento curriculares
CREATE OR REPLACE FUNCTION public.replace_curriculo_objetos(
  p_unidade_id uuid,
  p_objetos text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_desc text;
BEGIN
  IF public.get_user_role() NOT IN ('ADMIN', 'GESTOR', 'SECRETARIO') THEN
    RAISE EXCEPTION 'Permissão negada para editar currículo' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.curriculo_objetos WHERE unidade_id = p_unidade_id;

  IF p_objetos IS NOT NULL THEN
    FOREACH v_desc IN ARRAY p_objetos
    LOOP
      IF trim(v_desc) <> '' THEN
        INSERT INTO public.curriculo_objetos (unidade_id, descricao)
        VALUES (p_unidade_id, trim(v_desc));
      END IF;
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_curriculo_objetos(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_curriculo_objetos(uuid, text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.replace_curriculo_objetos(uuid, text[]) TO authenticated;

-- 3. Revogar privilégio anon em get_secretario_escola e get_diretor_escola
REVOKE ALL ON FUNCTION public.get_secretario_escola(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_diretor_escola(uuid) FROM anon;

COMMIT;
