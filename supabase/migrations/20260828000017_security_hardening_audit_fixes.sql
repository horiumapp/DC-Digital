-- =============================================================
-- DC Digital — Fix RLS, Security Definer Search Path & Log Hardening
-- Migration: 20260828000017_security_hardening_audit_fixes.sql
-- =============================================================
--
-- AUDITORIA FORENSE (Findings S-02, S-03, S-04):
--
-- 1. S-03: Funções SECURITY DEFINER do schema base atualizadas para
--    conter explicitamente `SET search_path TO 'public'` (ou 'public', 'auth'),
--    eliminando o risco de search_path hijacking em instâncias Postgres compartilhadas.
--
-- 2. S-02: Política de INSERT em `security_logs` endurecida para impedir
--    que usuários forjem logs de outros usuários ou insiram registros arbitrários.
--
-- 3. S-04: Política de INSERT em `user_consents` endurecida para exigir
--    usuário autenticado associado ao próprio user_id.
--
-- =============================================================

-- ---------------------------------------------------------------
-- 1. SECURITY DEFINER FUNCTIONS COM SEARCH_PATH EXPLÍCITO (S-03)
-- ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_lgpd_rate_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.lgpd_requests
  WHERE email = NEW.email
    AND created_at > NOW() - INTERVAL '1 hour';

  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Limite de solicitações LGPD excedido. Máximo de 5 por hora por e-mail. Tente novamente mais tarde.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_escola_id()
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT escola_id FROM public.usuarios WHERE id = auth.uid());
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_admin_promotion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Evitar recursão de triggers
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_whitelist WHERE email = NEW.email) THEN
    -- Apenas promove se o role no app_metadata não for GESTOR ou SECRETARIO
    IF COALESCE(NEW.raw_app_meta_data->>'role', '') NOT IN ('GESTOR', 'SECRETARIO') THEN
      NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb;
      UPDATE public.usuarios SET cargo = 'ADMIN' WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

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
  v_cargo    := COALESCE(NEW.raw_app_meta_data->>'role', 'PROFESSOR');

  -- Insere na tabela pública de usuários com o cargo correto
  INSERT INTO public.usuarios (id, email, nome_completo, cargo)
  VALUES (NEW.id, NEW.email, v_nome, v_cargo)
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email, 
      nome_completo = EXCLUDED.nome_completo, 
      cargo = EXCLUDED.cargo;

  -- Apenas insere na tabela de professores se for PROFESSOR
  IF v_cargo = 'PROFESSOR' THEN
    INSERT INTO public.professores (nome, email, cpf, telefone, vinculo, status)
    VALUES (v_nome, NEW.email, v_cpf, v_telefone, v_vinculo, 'Inativo')
    ON CONFLICT (email) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_user_cargo_to_auth()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  -- Evitar recursão de triggers
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.cargo IS DISTINCT FROM NEW.cargo THEN
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.cargo)
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------
-- 2. HARDENING DE RLS EM SECURITY_LOGS (S-02)
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "auth_insert_security_logs" ON public.security_logs;
CREATE POLICY "auth_insert_security_logs" ON public.security_logs
  FOR INSERT
  WITH CHECK (
    -- Usuário autenticado só pode registrar eventos associados ao próprio UID (ou nulo)
    (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
    -- Eventos anônimos permitidos apenas para tentativas de login
    OR (auth.uid() IS NULL AND action IN ('LOGIN', 'LOGIN_FAILED'))
  );

-- ---------------------------------------------------------------
-- 3. HARDENING DE RLS EM USER_CONSENTS (S-04)
-- ---------------------------------------------------------------

DROP POLICY IF EXISTS "Allow public insert for user_consents" ON public.user_consents;
DROP POLICY IF EXISTS "auth_insert_user_consents" ON public.user_consents;
CREATE POLICY "auth_insert_user_consents" ON public.user_consents
  FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated'
    AND (user_id IS NULL OR user_id = auth.uid())
  );
