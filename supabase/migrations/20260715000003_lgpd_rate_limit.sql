-- =============================================================
-- DC Digital -- Rate Limiting Server-Side para Solicitações LGPD
-- Migration: 20260715000003_lgpd_rate_limit.sql
-- =============================================================
-- FIX #4: Implementar rate limiting server-side para lgpd_requests.
-- O client-side via sessionStorage é facilmente bypassável (nova aba).
-- Esta trigger limita a 5 solicitações por email a cada 15 minutos.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. TRIGGER FUNCTION — rate limiting por email (15 min / 5 req)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_lgpd_rate_limit()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  recent_count INTEGER;
  window_start TIMESTAMPTZ := NOW() - INTERVAL '15 minutes';
BEGIN
  -- Contar solicitações recentes do mesmo email na janela de 15 minutos
  SELECT COUNT(*) INTO recent_count
  FROM public.lgpd_requests
  WHERE
    email = LOWER(TRIM(NEW.email))
    AND created_at >= window_start;

  IF recent_count >= 5 THEN
    RAISE EXCEPTION
      'RATE_LIMIT_EXCEEDED: Muitas solicitações LGPD do email % na última hora. Aguarde 15 minutos.'
      USING
        ERRCODE = 'P0001', -- raise_exception
        DETAIL = format('Email: %s, Solicitações recentes: %s', NEW.email, recent_count);
  END IF;

  -- Normalizar email antes de inserir
  NEW.email := LOWER(TRIM(NEW.email));

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------
-- 2. APLICAR TRIGGER NA TABELA lgpd_requests
-- ---------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_lgpd_rate_limit ON public.lgpd_requests;
CREATE TRIGGER trg_lgpd_rate_limit
  BEFORE INSERT ON public.lgpd_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.check_lgpd_rate_limit();

-- ---------------------------------------------------------------
-- 3. ÍNDICE PARA PERFORMANCE DA QUERY DE CONTAGEM
--    A trigger faz SELECT por email + created_at. Sem índice, isso
--    seria um full scan em tabelas grandes.
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_email_created_at
  ON public.lgpd_requests (email, created_at DESC);

-- ---------------------------------------------------------------
-- 4. GARANTIR QUE A TRIGGER FUNCTION NÃO É ACESSÍVEL DIRETAMENTE
--    (apenas invocada pela trigger, não pelo client)
-- ---------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.check_lgpd_rate_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_lgpd_rate_limit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_lgpd_rate_limit() FROM anon;
