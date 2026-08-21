-- =============================================================
-- DC Digital — Auditoria na promoção de ADMIN via whitelist
-- Migration: 20260820000016_admin_promo_audit.sql
-- =============================================================
--
-- PROBLEMA: O trigger handle_admin_promotion promove usuários
--   para ADMIN quando o email está em admin_whitelist, mas
--   não registra essa promoção em nenhum log de auditoria.
--   Promoções de privilégio devem ser sempre rastreáveis.
--
-- SOLUÇÃO: Atualizar handle_admin_promotion para inserir um
--   registro em security_logs quando uma promoção ocorrer,
--   incluindo o email (via hash SHA-256), o cargo anterior
--   e o novo cargo.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_admin_promotion()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  v_cargo_anterior text;
BEGIN
  -- Evitar recursão de triggers
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.admin_whitelist WHERE email = NEW.email) THEN
    -- Apenas promove se o role no app_metadata não for GESTOR ou SECRETARIO
    IF COALESCE(NEW.raw_app_meta_data->>'role', '') NOT IN ('GESTOR', 'SECRETARIO') THEN
      -- Captura o cargo anterior para o log de auditoria
      v_cargo_anterior := COALESCE(NEW.raw_app_meta_data->>'role', 'PROFESSOR');

      NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "ADMIN"}'::jsonb;
      UPDATE public.usuarios SET cargo = 'ADMIN' WHERE id = NEW.id;

      -- FIX S5: Registrar promoção de privilégio no log de segurança
      -- Usa hash do email para não armazenar PII direta (LGPD)
      INSERT INTO public.security_logs (
        user_id,
        user_email,
        action,
        entity,
        entity_id,
        ip,
        user_agent,
        metadata,
        created_at
      ) VALUES (
        NEW.id,
        public.hash_text(NEW.email),  -- hash SHA-256, nunca email em texto plano
        'PERMISSION_CHANGE',
        'usuarios',
        NEW.id::text,
        NULL,                           -- IP não disponível em trigger de banco
        'system-trigger',
        jsonb_build_object(
          'trigger',       'handle_admin_promotion',
          'cargo_anterior', v_cargo_anterior,
          'cargo_novo',    'ADMIN',
          'fonte',         'admin_whitelist'
        ),
        now()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
