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
const prof = '30000000-0000-0000-0000-000000000077';
const profUser = '00000000-0000-0000-0000-000000000077';

await db.exec(`INSERT INTO auth.users(id,email,raw_app_meta_data) VALUES
 ('${profUser}','alheio@test.local','{"role":"PROFESSOR"}'),
 ('${sec}','secretary@test.local','{"role":"SECRETARIO"}');
 INSERT INTO public.escolas(id,nome) VALUES('${S}','A'),('${B}','B');
 UPDATE public.usuarios SET cargo='SECRETARIO', escola_id='${S}', nome_completo='Sec' WHERE id='${sec}';
 INSERT INTO public.professores(id,nome,email,usuario_id,disciplinas) VALUES('${prof}','Alheio','alheio@test.local','${profUser}',ARRAY['MAT'])
   ON CONFLICT (email) DO UPDATE SET id=EXCLUDED.id, usuario_id=EXCLUDED.usuario_id, disciplinas=EXCLUDED.disciplinas;
 INSERT INTO public.professor_alocacoes(professor_id,escola_id,turno) VALUES('${prof}','${B}','Matutino') ON CONFLICT DO NOTHING;`);

await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: sec, role: 'authenticated', email: 'secretary@test.local' })]);
await db.exec('SET ROLE authenticated');
// Passo 1 do ataque: criar a própria alocação no registro do professor alheio.
try {
  await db.exec(`INSERT INTO professor_alocacoes(professor_id,escola_id,turno) VALUES ('${prof}','${S}','Noturno')`);
  console.log('alocacao criada pelo secretario: OK (esperado)');
} catch (e) { console.log('alocacao rejeitada:', e.message); }

// Passo 2: trocar a identidade de acesso.
try {
  const r = await db.query(`UPDATE professores SET usuario_id='${sec}' WHERE id='${prof}'`);
  console.log('usuario_id UPDATE rows:', r.affectedRows);
} catch (e) { console.log('usuario_id rejected:', e.message); }
try {
  const r = await db.query(`UPDATE professores SET email='secretary@test.local' WHERE id='${prof}'`);
  console.log('email UPDATE rows:', r.affectedRows);
} catch (e) { console.log('email rejected:', e.message); }

await db.exec('RESET ROLE');
console.log('alocacoes secretaria:', (await db.query(`SELECT count(*)::int c FROM professor_alocacoes WHERE professor_id='${prof}' AND escola_id='${S}'`)).rows[0].c);
console.log('usuario_id atual:', (await db.query(`SELECT usuario_id FROM professores WHERE id='${prof}'`)).rows[0].usuario_id);
console.log('email atual:', (await db.query(`SELECT email FROM professores WHERE id='${prof}'`)).rows[0].email);
await db.close();
