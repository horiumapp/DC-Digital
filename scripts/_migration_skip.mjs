import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';

const files = (await readdir('supabase/migrations')).filter((x) => x.endsWith('.sql')).sort();

async function boot(skip) {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE ROLE supabase_auth_admin;
    CREATE SCHEMA auth; CREATE SCHEMA extensions;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_app_meta_data jsonb DEFAULT '{}', raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
    CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'email' $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
    CREATE FUNCTION extensions.digest(text, text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT sha256(convert_to($1,'UTF8')) $$;
    CREATE FUNCTION public.digest(text, text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT extensions.digest($1,$2) $$;
  `);
  for (const file of files) {
    if (file === skip) continue;
    let sql = await readFile('supabase/migrations/' + file, 'utf8');
    sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto(?: WITH SCHEMA extensions)?;/g, '');
    await db.exec(sql);
  }
  const parts = [];
  const queries = [
    `SELECT n.nspname||'.'||c.relname||':'||c.relkind::text||':'||c.relrowsecurity::text||':'||c.relforcerowsecurity::text FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','v','m','i','S','p') ORDER BY 1`,
    `SELECT table_name||'.'||column_name||':'||data_type||':'||coalesce(column_default,'')||':'||is_nullable FROM information_schema.columns WHERE table_schema='public' ORDER BY 1`,
    `SELECT p.proname||'('||pg_get_function_identity_arguments(p.oid)||')='||md5(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY 1`,
    `SELECT schemaname||'.'||tablename||'.'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'')||':'||roles::text FROM pg_policies WHERE schemaname='public' ORDER BY 1`,
    `SELECT indexname||':'||indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 1`,
    `SELECT tgrelid::regclass::text||':'||tgname||':'||pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal ORDER BY 1`,
    `SELECT conrelid::regclass::text||':'||conname||':'||pg_get_constraintdef(oid) FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY 1`,
    `SELECT grantee||':'||table_name||':'||column_name||':'||privilege_type FROM information_schema.column_privileges WHERE table_schema='public' ORDER BY 1`,
    `SELECT grantee||':'||routine_name||':'||privilege_type FROM information_schema.routine_privileges WHERE routine_schema='public' ORDER BY 1`,
  ];
  for (const sql of queries) {
    const { rows } = await db.query(sql);
    parts.push(rows.map((row) => Object.values(row).join('|')).join('\n'));
  }
  await db.close();
  return parts.join('\n---\n');
}

const candidates = process.argv.slice(2);
const baseline = await boot(null);
console.log('baseline ready', files.length);
if (candidates.length === 1 && candidates[0] === '--all-flagged') {
  const flagged = [
    '20260719000005_fix_unique_constraints.sql',
    '20260731000009_fix_audit_log_email_hash.sql',
    '20260813000012_revoke_anon_lgpd_insert.sql',
    '20260820000014_fix_rls_professor_by_uid.sql',
    '20260820000016_admin_promo_audit.sql',
    '20260907000020_security_fix_cpf_spoofing_and_role_escalation.sql',
    '20260926000003_audit_account_provisioning.sql',
    '20261001000000_fix_gestor_multi_tenant_isolation.sql',
    '20261002000000_fix_sync_lock_timeout_and_defaults.sql',
    '20261002000001_restore_professor_aluno_p_acesso_por_turma.sql',
    '20261003000000_fix_diretor_secretario_boletim.sql',
    '20261007000000_hardening_academic_mutation_casts.sql',
    '20261010000000_fast_academic_lookup.sql',
    '20261012000001_allow_admin_user_insert.sql',
  ];
  const original = files.splice(0, files.length, ...files.filter((file) => !flagged.includes(file)));
  void original;
  try {
    const next = await boot(null);
    console.log(next === baseline ? 'COMBINED MATCH' : 'COMBINED DIFFERENT');
  } catch (error) {
    console.log('COMBINED FAIL', error.message);
  }
  process.exit(0);
}
const redundant = [];
for (const file of files) {
  try {
    const next = await boot(file);
    if (next === baseline) redundant.push(file);
    else process.stdout.write('.');
  } catch (error) {
    process.stdout.write('!');
  }
}
console.log('\nREDUNDANT');
for (const file of redundant) console.log(file);
