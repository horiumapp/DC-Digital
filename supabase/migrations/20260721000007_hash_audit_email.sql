-- =============================================================
-- DC Digital — Hash do Email no Audit Log
-- Migration: 20260721000007_hash_audit_email.sql
-- =============================================================
-- FIX A2 (LGPD): O trigger fn_audit_log_changes armazenava auth.email()
-- em texto plano no audit_log. Isso é inconsistente com a boa prática já
-- adotada no securityLogService.ts (frontend) que usa hash SHA-256.
--
-- Esta migration:
-- 1. Garante que a extensão pgcrypto está habilitada (disponível no Supabase)
-- 2. Adiciona coluna user_email_hash ao audit_log (se não existir)
-- 3. Recria o trigger para usar hash em vez de texto plano
-- 4. Preenche retroativamente os hashes de registros antigos (se existirem)
-- =============================================================

-- ---------------------------------------------------------------
-- 1. HABILITAR pgcrypto (extensão nativa do Supabase)
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------
-- 2. ADICIONAR coluna de hash (se a tabela audit_log existir)
--    A coluna user_email original é mantida mas será deprecated.
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    -- Adicionar coluna de hash SHA-256 do email
    ALTER TABLE public.audit_log
      ADD COLUMN IF NOT EXISTS user_email_hash text;

    -- Preencher retroativamente (somente se user_email não for nulo)
    UPDATE public.audit_log
      SET user_email_hash = encode(digest(lower(trim(user_email)), 'sha256'), 'hex')
      WHERE user_email IS NOT NULL
        AND user_email_hash IS NULL;

    -- Deprecar coluna original (comentário de auditoria)
    COMMENT ON COLUMN public.audit_log.user_email IS
      'DEPRECATED: Usar user_email_hash (SHA-256). Esta coluna será removida na próxima migration maior.';

    COMMENT ON COLUMN public.audit_log.user_email_hash IS
      'Hash SHA-256 do email do usuário. Permite correlação de eventos sem expor PII (LGPD).';
  END IF;
END;
$$;

-- ---------------------------------------------------------------
-- 3. RECRIAR fn_audit_log_changes com hash em vez de texto plano
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_record_id TEXT;
  v_email_raw TEXT;
  v_email_hash TEXT;
BEGIN
  -- Determina o ID do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
  ELSE
    v_record_id := NEW.id::TEXT;
  END IF;

  -- FIX A2 (LGPD): Hash SHA-256 do email em vez de texto plano.
  -- Permite correlacionar eventos do mesmo usuário sem armazenar PII.
  v_email_raw := auth.email();
  IF v_email_raw IS NOT NULL THEN
    v_email_hash := encode(digest(lower(trim(v_email_raw)), 'sha256'), 'hex');
  END IF;

  INSERT INTO public.audit_log (
    user_id,
    user_email,      -- mantido temporariamente como NULL para compatibilidade
    user_email_hash, -- FIX A2: hash SHA-256 do email
    action,
    table_name,
    record_id
  ) VALUES (
    auth.uid(),
    NULL,            -- não armazenar mais o email em texto plano
    v_email_hash,
    TG_OP,
    TG_TABLE_NAME,
    v_record_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ---------------------------------------------------------------
-- 4. ÍNDICE para performance de busca por hash (se a tabela existir)
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_audit_log_email_hash
      ON public.audit_log (user_email_hash)
      WHERE user_email_hash IS NOT NULL;
  END IF;
END;
$$;
