BEGIN;
-- Explicit API privileges: access still requires the existing RLS policies.
-- Avoid relying on legacy Supabase default privileges in a fresh installation.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['admin_whitelist','aluno_transferencias','alunos','audit_log',
 'avaliacoes','conteudos','curriculo_habilidades','curriculo_objetos','curriculo_unidades',
 'escolas','fechamentos_bimestres','frequencias','lgpd_requests','notas','periodos_letivos',
 'professor_alocacoes','professor_horarios','professores','security_logs','turmas','user_consents','usuarios'] LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=format('public.%I',t)::regclass) THEN
   RAISE EXCEPTION 'RLS obrigatória antes de conceder privilégios: %',t;
  END IF;
  EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON public.%I TO authenticated,service_role',t);
 END LOOP;
END $$;
GRANT SELECT,INSERT ON public.sync_receipts TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.audit_log_id_seq,public.avaliacoes_id_seq,
 public.conteudos_id_seq,public.frequencias_id_seq,public.notas_id_seq TO authenticated,service_role;
GRANT INSERT ON public.security_logs TO anon;
-- Schema-only exports omit triggers on the managed auth schema. Install only if absent.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass
   AND tgfoid='public.handle_new_user()'::regprocedure AND NOT tgisinternal) THEN
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
 END IF;
END $$;
COMMIT;
