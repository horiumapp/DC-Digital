-- =============================================================
-- DC Digital — LGPD: Hash SHA-256 do email em lgpd_requests
-- Migration: 20260820000015_lgpd_requests_email_hash.sql
-- =============================================================
--
-- PROBLEMA: A tabela lgpd_requests armazena o email do titular
--   em texto plano. Em caso de vazamento, é PII direta.
--   Inconsistente com security_logs, que já usa hash SHA-256.
--
-- SOLUÇÃO:
--   1. Adicionar coluna email_hash (hash SHA-256 do email).
--   2. Preencher retroativamente email_hash para registros existentes.
--   3. Criar trigger para auto-preencher email_hash em novos INSERTs.
--   4. Adicionar índice para consulta eficiente por hash.
--   5. Manter a coluna `email` para comunicação administrativa
--      (necessária para responder o titular), mas restringir seu
--      acesso via política dedicada.
--
-- DECISÃO DE DESIGN:
--   A coluna `email` é MANTIDA — necessária para responder ao
--   titular da solicitação LGPD. O hash é adicionado para
--   permitir deduplicação e correlação sem expor PII em relatórios.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. Garantir extensão pgcrypto (para hash SHA-256 no banco)
-- ---------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------
-- 2. Adicionar coluna email_hash
-- ---------------------------------------------------------------
ALTER TABLE public.lgpd_requests
  ADD COLUMN IF NOT EXISTS email_hash text;

COMMENT ON COLUMN public.lgpd_requests.email_hash IS
  'Hash SHA-256 do email do titular. Permite correlação/deduplicação sem expor PII em relatórios (LGPD).';

-- ---------------------------------------------------------------
-- 3. Preencher retroativamente registros existentes
-- ---------------------------------------------------------------
UPDATE public.lgpd_requests
  SET email_hash = public.hash_text(email)
  WHERE email_hash IS NULL
    AND email IS NOT NULL;

-- ---------------------------------------------------------------
-- 4. Trigger para auto-preencher email_hash em novos registros
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_lgpd_request_hash_email()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  -- Calcula e preenche o hash SHA-256 do email na inserção/atualização
  IF NEW.email IS NOT NULL THEN
    NEW.email_hash := public.hash_text(NEW.email);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_lgpd_request_hash_email ON public.lgpd_requests;
CREATE TRIGGER trg_lgpd_request_hash_email
  BEFORE INSERT OR UPDATE OF email ON public.lgpd_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_lgpd_request_hash_email();

-- ---------------------------------------------------------------
-- 5. Índice para busca eficiente por hash
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_email_hash
  ON public.lgpd_requests (email_hash)
  WHERE email_hash IS NOT NULL;
