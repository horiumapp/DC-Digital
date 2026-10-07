import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';

const db = new PGlite();
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
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

for (const file of (await readdir('supabase/migrations')).filter(x => x.endsWith('.sql')).sort()) {
  let sql = await readFile('supabase/migrations/' + file, 'utf8');
  sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto(?: WITH SCHEMA extensions)?;/g, '');
  await db.exec(sql);
}
await db.exec(await readFile('supabase/seed_curriculo.sql', 'utf8'));

const teacherId = '00000000-0000-0000-0000-000000000002';
const schoolId = '10000000-0000-0000-0000-000000000001';
const classId = '20000000-0000-0000-0000-000000000001';
const profId = '30000000-0000-0000-0000-000000000001';
const alunoId = '40000000-0000-0000-0000-000000000001';

await db.exec(`
  INSERT INTO auth.users(id,email) VALUES ('${teacherId}','teacher@test.local') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.escolas(id,nome) VALUES('${schoolId}','A') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.usuarios(id,email,nome_completo,cargo,escola_id) VALUES ('${teacherId}','teacher@test.local','Professor','PROFESSOR','${schoolId}')
  ON CONFLICT(id) DO UPDATE SET cargo=excluded.cargo,escola_id=excluded.escola_id;
  INSERT INTO public.turmas(id,nome,turno,escola_id,ano_letivo) VALUES('${classId}','1º Ano A','Matutino','${schoolId}','2026') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.professores(id,nome,email,usuario_id,disciplinas) VALUES('${profId}','P','teacher@test.local','${teacherId}',ARRAY['MAT','HIST']) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.professor_horarios(professor_id,turma_id,escola_id,dia_semana,tempo_ordem,componente) VALUES('${profId}','${classId}','${schoolId}',1,1,'MAT') ON CONFLICT DO NOTHING;
  INSERT INTO public.alunos(id,escola_id,turma_id,nome,data_nascimento,nome_responsavel,telefone,endereco,cpf) VALUES ('${alunoId}','${schoolId}','${classId}','Aluno','2015-01-01','R','0','Rua','11111111111') ON CONFLICT (id) DO NOTHING;
`);

await db.query("SELECT set_config('request.jwt.claims',$1,false)", [
  JSON.stringify({ sub: teacherId, role: 'authenticated', email: 'teacher@test.local', app_metadata: { role: 'PROFESSOR' } })
]);
await db.exec('SET ROLE authenticated');

// Test frequencias
try {
  const fRes = await db.query('SELECT apply_academic_mutation($1,$2,$3,$4) as res', [
    'frequencias', 'UPSERT',
    JSON.stringify({ turma_id: classId, aluno_id: alunoId, data: '2026-03-01', tempo: '1', disciplina: 'MAT', status: 'P', participacao: 'Presencial', _expected_revision: 0 }),
    '50000000-0000-0000-0000-000000000010'
  ]);
  console.log('frequencias OK:', fRes.rows[0].res);
} catch (e) {
  console.error('frequencias FAILED:', e.message);
}

// Test conteudos
try {
  const cRes = await db.query('SELECT apply_academic_mutation($1,$2,$3,$4) as res', [
    'conteudos', 'UPSERT',
    JSON.stringify({ turma_id: classId, data: '2026-03-01', tempo: '1', disciplina: 'MAT', objetos: [], habilidades: [], descricao: 'Aula 1', _expected_revision: 0 }),
    '50000000-0000-0000-0000-000000000011'
  ]);
  console.log('conteudos OK:', cRes.rows[0].res);
} catch (e) {
  console.error('conteudos FAILED:', e.message);
}

// Test avaliacoes
let avId;
try {
  const aRes = await db.query('SELECT apply_academic_mutation($1,$2,$3,$4) as res', [
    'avaliacoes', 'INSERT',
    JSON.stringify({ turma_id: classId, tipo: 'PROVA', data: '2026-03-01', instrumento: 'Prova 1', objetos: [], bimestre: '1. BIMESTRE', valor_maximo: 10, disciplina: 'MAT' }),
    '50000000-0000-0000-0000-000000000012'
  ]);
  console.log('avaliacoes OK:', aRes.rows[0].res);
  avId = aRes.rows[0].res[0].id;
} catch (e) {
  console.error('avaliacoes FAILED:', e.message);
}

// Test notas with array in payload.records
try {
  const nRes = await db.query('SELECT apply_academic_mutation($1,$2,$3,$4) as res', [
    'notas', 'UPSERT',
    JSON.stringify({ records: [{ avaliacao_id: avId, aluno_id: alunoId, valor: 8.5, _expected_revision: 0 }] }),
    '50000000-0000-0000-0000-000000000013'
  ]);
  console.log('notas OK:', nRes.rows[0].res);
} catch (e) {
  console.error('notas FAILED:', e.message);
}

// Test fechamentos
try {
  const fcRes = await db.query('SELECT apply_academic_mutation($1,$2,$3,$4) as res', [
    'fechamentos', 'UPSERT',
    JSON.stringify({ turma_id: classId, disciplina: 'MAT', bimestre: '1. BIMESTRE', status: 'FECHADO', usuario_fechamento_id: teacherId, _expected_revision: 0 }),
    '50000000-0000-0000-0000-000000000014'
  ]);
  console.log('fechamentos OK:', fcRes.rows[0].res);
} catch (e) {
  console.error('fechamentos FAILED:', e.message);
}
