-- =============================================================
-- DC Digital -- Revogar INSERT anon na tabela lgpd_requests
-- Migration: 20260813000012_revoke_anon_lgpd_insert.sql
-- =============================================================
-- Após criar a Edge Function `lgpd-request` (que usa service_role),
-- removemos a permissão de INSERT direto do role `anon` na tabela
-- lgpd_requests. Isso força que todas as inserções públicas passem
-- pela Edge Function, que aplica rate limiting por IP.
--
-- A trigger `trg_lgpd_rate_limit` (migration 20260715000003) continua
-- ativa como camada adicional de proteção por email.
-- =============================================================

-- 1. Revogar INSERT do anon (formulário público agora usa Edge Function)
REVOKE INSERT ON public.lgpd_requests FROM anon;

-- 2. Manter SELECT para que o painel admin (authenticated) continue funcionando
-- (as permissões de SELECT/UPDATE para authenticated não são alteradas)

-- 3. Comentário de auditoria
COMMENT ON TABLE public.lgpd_requests IS
  'Solicitações LGPD. INSERT via Edge Function lgpd-request (service_role). '
  'Rate limiting: IP (Edge Function) + email (trigger trg_lgpd_rate_limit). '
  'Migration: 20260813000012_revoke_anon_lgpd_insert.sql';
