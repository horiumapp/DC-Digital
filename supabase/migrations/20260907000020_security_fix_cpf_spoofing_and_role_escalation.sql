-- =============================================================
-- DC Digital — Fix RLS: Prevenção de Spoofing de CPF (BOLA/IDOR) e
-- Proteção contra Auto-Registro de Professor Não Autorizado
-- Migration: 20260907000020_security_fix_cpf_spoofing_and_role_escalation.sql
-- =============================================================
--
-- PROBLEMA 1 (BOLA/IDOR): As políticas e helpers de acesso de ALUNO
--   consultavam `auth.jwt() -> 'user_metadata' ->> 'cpf'`. Como o
--   `raw_user_meta_data` pode ser editado livremente pelo usuário via
--   API de cliente (`supabase.auth.updateUser`), qualquer aluno podia
--   trocar seu CPF nos metadados para o de outro aluno e assumir sua
--   identidade, acessando notas, frequência e dados pessoais da vítima.
--
-- SOLUÇÃO 1: Remover o uso de `user_metadata->>'cpf'`. O acesso legítimo
--   do aluno é restrito a:
--   a) Vínculo relacional direto por UUID (`alunos.usuario_id = auth.uid()` ou `alunos.id = auth.uid()`);
--   b) Pseudo-e-mail oficial do sistema (`<cpf>@aluno.dcdigital.local`),
--      que é gerenciado pelo backend/admin e imune à alteração pelo cliente.
--
-- PROBLEMA 2 (Escalonamento de Privilégio): O trigger `handle_new_user`
--   adotava fallback de cargo 'PROFESSOR' quando `raw_app_meta_data->>'role'`
--   era nulo. Em caso de cadastros diretos pela API pública do GoTrue,
--   qualquer invasor recebia automaticamente permissões de PROFESSOR.
--
-- SOLUÇÃO 2: Alterar o fallback para 'PENDENTE'. O usuário sem role
--   definido pelo admin não tem acesso pedagógico e não é inserido em
--   `public.professores`.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. HELPERS DE ACESSO DO ALUNO (IMUNES A SPOOFING DE USER_METADATA)
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
            AND replace(a.cpf, '.', '') = split_part(auth.jwt() ->> 'email', '@', 1)
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
            AND replace(a.cpf, '.', '') = split_part(auth.jwt() ->> 'email', '@', 1)
          )
        )
    )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.aluno_tem_acesso_a_turma(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aluno_e_o_proprio(uuid) TO authenticated;

-- ---------------------------------------------------------------
-- 2. POLÍTICA SELECT EM ALUNOS (REMOÇÃO DO SPOOFING DE USER_METADATA)
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
          AND replace(cpf, '.', '') = split_part(auth.jwt() ->> 'email', '@', 1)
        )
      )
    )
  );

-- ---------------------------------------------------------------
-- 3. TRIGGER HANDLE_NEW_USER (BLOQUEIA PROMOÇÃO AUTOMÁTICA A PROFESSOR)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  v_nome text;
  v_cpf text;
  v_telefone text;
  v_vinculo text;
  v_cargo text;
BEGIN
  v_nome     := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  v_cpf      := COALESCE(NEW.raw_user_meta_data->>'cpf', '');
  v_telefone := COALESCE(NEW.raw_user_meta_data->>'telefone', '');
  v_vinculo  := COALESCE(NEW.raw_user_meta_data->>'vinculo', 'A Definir');
  -- SEGURANÇA: Usuários sem role no app_metadata assumem 'PENDENTE' (sem privilégios).
  -- Apenas administradores/gestores via Edge Function atribuem cargos privilegiados.
  v_cargo    := COALESCE(NEW.raw_app_meta_data->>'role', 'PENDENTE');

  -- Insere na tabela pública de usuários com o cargo seguro
  INSERT INTO public.usuarios (id, email, nome_completo, cargo)
  VALUES (NEW.id, NEW.email, v_nome, v_cargo)
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email, 
      nome_completo = EXCLUDED.nome_completo, 
      cargo = EXCLUDED.cargo;

  -- Apenas insere na tabela de professores se for explicitamente PROFESSOR
  IF v_cargo = 'PROFESSOR' THEN
    INSERT INTO public.professores (nome, email, cpf, telefone, vinculo, status)
    VALUES (v_nome, NEW.email, v_cpf, v_telefone, v_vinculo, 'Inativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Trigger de novo usuário em auth.users. Garante que cadastros sem role explícito fiquem PENDENTE (Migration 20260907000020).';
