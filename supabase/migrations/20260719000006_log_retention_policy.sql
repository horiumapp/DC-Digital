-- =============================================================
-- DC Digital — Política de Retenção de Logs e Índices de Performance
-- Migration: 20260719000006_log_retention_policy.sql
-- =============================================================
-- FIX L4: Implementar expiração automática de logs de auditoria.
--
-- LGPD — Princípio da minimização (Art. 6º, III):
--   Dados pessoais não devem ser retidos além do necessário.
--   security_logs e audit_log devem ter política de retenção.
--
-- PERFORMANCE:
--   Logs ilimitados causam table scan lento em consultas de auditoria.
--   Índices compostos evitam full scans nas queries mais comuns.
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ÍNDICES DE PERFORMANCE para queries comuns em logs
-- ---------------------------------------------------------------

-- security_logs: busca por user_id + data (painel de auditoria)
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id_created_at
  ON public.security_logs (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- security_logs: busca por action + data (relatórios de segurança)
CREATE INDEX IF NOT EXISTS idx_security_logs_action_created_at
  ON public.security_logs (action, created_at DESC);

-- audit_log: busca por table_name + data (rastreamento de alterações)
CREATE INDEX IF NOT EXISTS idx_audit_log_table_created_at
  ON public.audit_log (table_name, created_at DESC);

-- audit_log: busca por user_id (trilha de auditoria por usuário)
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id_created_at
  ON public.audit_log (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ---------------------------------------------------------------
-- 2. FUNÇÃO DE LIMPEZA DE LOGS ANTIGOS
--    Retém os últimos 365 dias de security_logs e audit_log.
--    Chamada manualmente ou via pg_cron se disponível.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(retention_days INTEGER DEFAULT 365)
  RETURNS TABLE (security_logs_deleted BIGINT, audit_logs_deleted BIGINT)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_security_deleted BIGINT;
  v_audit_deleted    BIGINT;
  v_cutoff           TIMESTAMPTZ := NOW() - (retention_days || ' days')::INTERVAL;
BEGIN
  -- Deletar security_logs mais antigos que o período de retenção
  DELETE FROM public.security_logs
  WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_security_deleted = ROW_COUNT;

  -- Deletar audit_log mais antigos que o período de retenção
  DELETE FROM public.audit_log
  WHERE created_at < v_cutoff;
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  RAISE NOTICE '[cleanup_old_logs] Removidos: % security_logs, % audit_logs (retenção: % dias)',
    v_security_deleted, v_audit_deleted, retention_days;

  RETURN QUERY SELECT v_security_deleted, v_audit_deleted;
END;
$function$;

-- Apenas ADMIN pode chamar a função de limpeza
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(INTEGER) FROM anon;

-- ---------------------------------------------------------------
-- 3. AGENDAR LIMPEZA AUTOMÁTICA via pg_cron (se disponível)
--    O pg_cron é uma extensão do Supabase (Pro/Team).
--    Se não disponível, chamar cleanup_old_logs() manualmente via
--    painel SQL do Supabase ou script de manutenção mensal.
-- ---------------------------------------------------------------
DO $$
BEGIN
  -- Verificar se pg_cron está disponível
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Agendar para rodar toda segunda-feira às 03:00 UTC
    PERFORM cron.schedule(
      'dc-digital-log-cleanup',              -- nome único do job
      '0 3 * * 1',                           -- cron: toda segunda às 03:00 UTC
      $$SELECT public.cleanup_old_logs(365)$$
    );
    RAISE NOTICE 'pg_cron: job de limpeza de logs agendado com sucesso.';
  ELSE
    RAISE NOTICE 'pg_cron não disponível. Agendar cleanup_old_logs() manualmente via painel do Supabase.';
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 4. COMENTÁRIOS PARA DOCUMENTAÇÃO DO SCHEMA
-- ---------------------------------------------------------------
COMMENT ON FUNCTION public.cleanup_old_logs(INTEGER) IS
  'Remove registros de security_logs e audit_log mais antigos que retention_days dias. '
  'Padrão: 365 dias. Chamada via pg_cron ou manualmente pelo admin.';
