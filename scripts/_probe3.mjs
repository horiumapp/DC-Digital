import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
const db = new PGlite();
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE supabase_auth_admin;
 CREATE SCHEMA auth; CREATE SCHEMA extensions;
 CREATE TABLE auth.users(id uuid PRIMARY KEY, email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
 CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'email' $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
 GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
 CREATE FUNCTION extensions.digest(text,text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT sha256(convert_to($1,'UTF8')) $$;
 CREATE FUNCTION public.digest(text,text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT extensions.digest($1,$2) $$;
`);
for (const f of (await readdir('supabase/migrations')).filter(x => x.endsWith('.sql')).sort()) {
  let sql = await readFile('supabase/migrations/' + f, 'utf8');
  sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto(?: WITH SCHEMA extensions)?;/g, '');
  await db.exec(sql);
}
const S = '10000000-0000-0000-0000-000000000001';
const B = '10000000-0000-0000-0000-000000000002';
const sec = '00000000-0000-0000-0000-000000000003';
const profUser = '00000000-0000-0000-0000-000000000077';
const email = 'alheio@test.local';

await db.exec(`INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('${profUser}','${email}','{"role":"PROFESSOR"}'),
 ('${sec}','secretary@test.local','{"role":"SECRETARIO"}');
 INSERT INTO public.escolas(id,nome) VALUES('${S}','A'),('${B}','B');
 UPDATE public.usuarios SET cargo='SECRETARIO', escola_id='${S}' WHERE id='${sec}';`);
const prof = (await db.query('SELECT id FROM professores WHERE email=$1', [email])).rows[0].id;
await db.query("INSERT INTO public.professor_alocacoes(professor_id,escola_id,turno) VALUES($1,$2,'Matutino')", [prof, B]);

await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: sec, role: 'authenticated', email: 'secretary@test.local' })]);
await db.exec('SET ROLE authenticated');
console.log('role/uid:', (await db.query('SELECT public.get_user_role() r, public.get_user_escola_id() e, auth.uid() u')).rows);
await db.exec(`INSERT INTO professor_alocacoes(professor_id,escola_id,turno) VALUES ('${prof}','${S}','Noturno') ON CONFLICT DO NOTHING`);
console.log('aloc own school:', (await db.query(`SELECT count(*)::int c FROM professor_alocacoes WHERE escola_id='${S}'`)).rows[0].c);
try {
  const r = await db.query(`UPDATE professores SET usuario_id='${sec}' WHERE id='${prof}'`);
  console.log('update rows:', r.affectedRows);
} catch (e) { console.log('update erro:', e.message); }
await db.exec('RESET ROLE');
console.log('final:', (await db.query(`SELECT id,email,usuario_id FROM professores WHERE id='${prof}'`)).rows);
await db.close();
