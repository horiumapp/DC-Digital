-- =============================================================
-- DC Digital — Fix RLS Aluno CPF Regex Sanitization & Identity Linking
-- Migration: 20260908000021_fix_cpf_format_and_security_hardening.sql
-- =============================================================
--
-- PROBLEMAS CORRIGIDOS:
-- 1. Inconsistência de formatação de CPF no RLS do Aluno:
--    A migration 20260907000020 usava `replace(a.cpf, '.', '')`,
--    o que deixava hífens intactos (ex: "123456789-00"). Ao comparar
--    com o e-mail oficial (ex: "12345678900@aluno.dcdigital.local"),
--    a comparação falhava e o aluno legítimo era bloqueado pelo RLS.
--    SOLUÇÃO: Substituir por `regexp_replace(a.cpf, '\D', '', 'g')`.
--
-- 2. Vínculos órfãos de usuario_id:
--    Contas de professores e alunos já criadas no Auth mas sem usuario_id
--    preenchido nas tabelas de domínio são reconciliadas de forma
--    idempotente.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ATUALIZAR FUNÇÕES DE APOIO DO RLS PARA ALUNOS
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aluno_tem_acesso_a_turma(p_turma_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT (
    (SELECT public.get_user_role()) = 'ALUNO'
    AND EXISTS (
      SELECT 1
      FROM public.alunos a
      WHERE
        a.turma_id = p_turma_id
        AND (
          -- 1. Vínculo relacional direto via usuario_id ou ID do aluno
          (a.usuario_id IS NOT NULL AND a.usuario_id = auth.uid())
          OR (a.id = auth.uid())
          -- 2. Vínculo seguro pelo e-mail oficial institucional do aluno (<cpf>@aluno.dcdigital.local)
          OR (
            a.cpf IS NOT NULL
            AND auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
            AND regexp_replace(a.cpf, '\D', '', 'g') = split_part(auth.jwt() ->> 'email', '@', 1)
          )
        )
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.aluno_e_o_proprio(p_aluno_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT (
    (SELECT public.get_user_role()) = 'ALUNO'
    AND EXISTS (
      SELECT 1
      FROM public.alunos a
      WHERE
        a.id = p_aluno_id
        AND (
          -- 1. Vínculo relacional direto via usuario_id ou ID do aluno
          (a.usuario_id IS NOT NULL AND a.usuario_id = auth.uid())
          OR (a.id = auth.uid())
          -- 2. Vínculo seguro pelo e-mail oficial institucional do aluno (<cpf>@aluno.dcdigital.local)
          OR (
            a.cpf IS NOT NULL
            AND auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
            AND regexp_replace(a.cpf, '\D', '', 'g') = split_part(auth.jwt() ->> 'email', '@', 1)
          )
        )
    )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.aluno_tem_acesso_a_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aluno_e_o_proprio(uuid) TO authenticated;

-- ---------------------------------------------------------------
-- 2. ATUALIZAR POLÍTICA SELECT EM ALUNOS
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "auth_select_alunos" ON public.alunos;
CREATE POLICY "auth_select_alunos" ON public.alunos
  FOR SELECT
  USING (
    p_escola_permitida(alunos.escola_id)
    OR (
      (SELECT get_user_role()) = 'PROFESSOR'
      AND EXISTS (
        SELECT 1
        FROM professor_horarios ph
        JOIN professores p ON ph.professor_id = p.id
        WHERE
          ph.turma_id = alunos.turma_id
          AND (
            (p.usuario_id IS NOT NULL AND p.usuario_id = auth.uid())
            OR (p.usuario_id IS NULL AND p.email = (auth.jwt() ->> 'email'))
          )
      )
    )
    OR (
      (SELECT get_user_role()) = 'ALUNO'
      AND (
        (usuario_id IS NOT NULL AND usuario_id = auth.uid())
        OR (id = auth.uid())
        OR (
          cpf IS NOT NULL
          AND auth.jwt() ->> 'email' LIKE '%@aluno.dcdigital.local'
          AND regexp_replace(cpf, '\D', '', 'g') = split_part(auth.jwt() ->> 'email', '@', 1)
        )
      )
    )
  );

-- ---------------------------------------------------------------
-- 3. RECONCILIAÇÃO IDEMPOTENTE DE IDENTIDADES ÓRFÃS
-- ---------------------------------------------------------------

-- 3.1 Reconciliar professores que tenham conta em auth.users mas usuario_id NULL
UPDATE public.professores p
SET usuario_id = u.id
FROM auth.users u
WHERE p.usuario_id IS NULL
  AND lower(trim(p.email)) = lower(trim(u.email));

-- 3.2 Reconciliar alunos com contas institucionais geradas mas usuario_id NULL
UPDATE public.alunos a
SET usuario_id = u.id
FROM auth.users u
WHERE a.usuario_id IS NULL
  AND u.email LIKE '%@aluno.dcdigital.local'
  AND regexp_replace(a.cpf, '\D', '', 'g') = split_part(u.email, '@', 1);
