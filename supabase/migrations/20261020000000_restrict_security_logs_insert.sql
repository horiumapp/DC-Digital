-- =============================================================
-- DC Digital — Hardening: INSERT em public.security_logs
-- Migration: 20261020000000_restrict_security_logs_insert.sql
-- =============================================================
-- CONTEXTO (achado da revisão de segurança):
--   A policy base de INSERT em security_logs era `WITH CHECK (true)` e havia
--   `GRANT INSERT ... TO anon`. Isso permitia, em tese, que um cliente
--   ANÔNIMO inserisse linhas arbitrárias no log de auditoria (flood/poisoning),
--   e que um usuário AUTENTICADO forjasse eventos com o `user_id` de terceiros.
--
-- MITIGAÇÃO:
--   1. Revogar o INSERT direto do papel `anon`. O único fluxo anônimo legítimo
--      (registro de tentativa de login falha) já usa a RPC SECURITY DEFINER
--      `public.log_login_failure(text, text)`, que grava com rate-limit e NÃO
--      depende do grant de tabela — logo, nada quebra.
--   2. Restringir a policy de INSERT de autenticados para impedir spoofing de
--      `user_id`: só é permitido `user_id = auth.uid()` (o próprio usuário),
--      `user_id IS NULL`, ou chamadas de ADMIN/staff (is_admin_or_staff()),
--      que legitimamente registram eventos referindo-se a outros usuários.
--
-- NOTA: Isto NÃO altera lgpd_requests — aquela tabela tem INSERT público
--       intencional já protegido por trigger de rate-limit (5 req / 15 min).
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. Revogar INSERT anônimo direto na tabela de auditoria
-- -------------------------------------------------------------
REVOKE INSERT ON public.security_logs FROM anon;

-- -------------------------------------------------------------
-- 2. Policy de INSERT restritiva (impede forjar user_id de terceiros)
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "auth_insert_security_logs" ON public.security_logs;
CREATE POLICY "auth_insert_security_logs" ON public.security_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL
    OR user_id = (SELECT auth.uid())
    OR public.is_admin_or_staff()
  );

COMMIT;
