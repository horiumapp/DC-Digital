-- FIX C7: Hash de email no audit_log para compliance LGPD.
-- A função fn_audit_log_changes() gravava auth.email() em texto plano na coluna user_email.
-- Agora usa SHA-256 hash, consistente com a migration hash_audit_email para security_logs.

-- 1. Atualizar a função de trigger para usar hash SHA-256
CREATE OR REPLACE FUNCTION public.fn_audit_log_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_record_id TEXT;
  v_email_hash TEXT;
BEGIN
  -- Determina o ID do registro afetado
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::TEXT;
  ELSE
    v_record_id := NEW.id::TEXT;
  END IF;

  -- FIX C7 (LGPD): Hash SHA-256 do email em vez de texto plano.
  -- O hash permite correlacionar eventos do mesmo usuário sem expor PII.
  v_email_hash := NULL;
  IF auth.email() IS NOT NULL THEN
    v_email_hash := encode(digest(lower(trim(auth.email())), 'sha256'), 'hex');
  END IF;

  INSERT INTO audit_log (user_id, user_email, action, table_name, record_id)
  VALUES (
    auth.uid(),
    v_email_hash,  -- Hash SHA-256, não o email em texto plano
    TG_OP,
    TG_TABLE_NAME,
    v_record_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. Atualizar registros existentes que contêm emails em texto plano
-- (emails reais contêm '@', hashes SHA-256 não contêm)
UPDATE audit_log
SET user_email = encode(digest(lower(trim(user_email)), 'sha256'), 'hex')
WHERE user_email IS NOT NULL
  AND user_email LIKE '%@%';

-- 3. Adicionar comentário na coluna para documentação
COMMENT ON COLUMN audit_log.user_email IS 'Hash SHA-256 do email do usuário (LGPD). Não armazenar em texto plano.';
