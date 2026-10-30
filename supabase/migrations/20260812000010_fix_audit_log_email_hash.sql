-- =============================================================
-- DC Digital — Fix: Hash SHA-256 do email no Audit Log (LGPD)
-- Migration: 20260812000010_fix_audit_log_email_hash.sql
-- =============================================================
-- PROBLEMA: fn_audit_log_changes() persistia auth.email() em texto plano
-- no audit_log, violando princípios da LGPD de minimização de dados.
-- SOLUÇÃO: Gravar apenas o hash SHA-256 do email, que permite
-- correlacionar eventos do mesmo usuário sem expor PII.

-- ---------------------------------------------------------------
-- 1. Garantir que a extensão pgcrypto está habilitada
--    No Supabase, extensões ficam no schema 'extensions'
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------
-- 2. Helper: gera hash SHA-256 hexadecimal de um texto
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_text(input TEXT)
  RETURNS TEXT
  LANGUAGE sql
  IMMUTABLE
  SECURITY DEFINER
  SET search_path TO 'public', 'extensions'
AS $function$
  SELECT CASE
    WHEN input IS NULL THEN NULL
    ELSE encode(extensions.digest(lower(trim(input)), 'sha256'), 'hex')
  END;
$function$;

GRANT EXECUTE ON FUNCTION public.hash_text(TEXT) TO authenticated;

-- ---------------------------------------------------------------
-- 3. Atualizar fn_audit_log_changes() para gravar hash do email
--    em vez do email em texto plano
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_record_id TEXT;
BEGIN
  -- Determina o ID do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
  ELSE
    v_record_id := NEW.id::TEXT;
  END IF;

  INSERT INTO audit_log (user_id, user_email, action, table_name, record_id)
  VALUES (
    auth.uid(),
    hash_text(auth.email()),  -- LGPD FIX: hash SHA-256 em vez de texto plano
    TG_OP,
    TG_TABLE_NAME,
    v_record_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ---------------------------------------------------------------
-- 4. (Opcional) Hashear emails já existentes no audit_log
--    para retrocompatibilidade com dados anteriores.
--    ATENÇÃO: Isso é uma operação destrutiva — o email original
--    não poderá ser recuperado após a execução.
-- ---------------------------------------------------------------
-- Descomentar as linhas abaixo para aplicar em dados existentes:
-- UPDATE audit_log
--   SET user_email = hash_text(user_email)
--   WHERE user_email IS NOT NULL
--     AND user_email NOT LIKE '%@%' IS FALSE; -- Apenas emails não-hasheados
