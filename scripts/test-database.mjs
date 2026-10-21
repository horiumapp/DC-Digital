import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const db = new PGlite();
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE ROLE supabase_auth_admin;
 CREATE SCHEMA auth; CREATE SCHEMA extensions;
 CREATE TABLE auth.users(id uuid PRIMARY KEY, email text,raw_app_meta_data jsonb DEFAULT '{}',raw_user_meta_data jsonb DEFAULT '{}');
 CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
 CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'email' $$;
 CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'role' $$;
 GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
 -- PGlite has built-in SHA256, but does not ship pgcrypto. Only that extension is adapted.
 CREATE FUNCTION extensions.digest(text,text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT sha256(convert_to($1,'UTF8')) $$;
 CREATE FUNCTION public.digest(text,text) RETURNS bytea LANGUAGE sql IMMUTABLE AS $$ SELECT extensions.digest($1,$2) $$;
`);
for (const file of (await readdir('supabase/migrations')).filter(x=>x.endsWith('.sql')).sort()) {
 let sql = await readFile('supabase/migrations/'+file,'utf8');
 sql = sql.replace(/CREATE EXTENSION IF NOT EXISTS pgcrypto(?: WITH SCHEMA extensions)?;/g,'');
 try { await db.exec(sql); } catch(e) { console.error('Migration failed:',file,e.message); await db.close(); process.exit(1); }
}
await db.exec(await readFile('supabase/seed_curriculo.sql','utf8'));
console.log('All migrations applied to empty PostgreSQL (PGlite).');
const ids = {admin:'00000000-0000-0000-0000-000000000001',teacher:'00000000-0000-0000-0000-000000000002',secretary:'00000000-0000-0000-0000-000000000003',student:'00000000-0000-0000-0000-000000000004',school:'10000000-0000-0000-0000-000000000001',otherSchool:'10000000-0000-0000-0000-000000000002',class:'20000000-0000-0000-0000-000000000001',otherClass:'20000000-0000-0000-0000-000000000002',p:'30000000-0000-0000-0000-000000000001',a:'40000000-0000-0000-0000-000000000001',otherA:'40000000-0000-0000-0000-000000000002'};
async function asUser(id,role='authenticated') {
 await db.exec('RESET ROLE');
 await db.query("SELECT set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,role:'authenticated',email:id+'@test.local',app_metadata:{role:id===ids.admin?'ADMIN':id===ids.teacher?'PROFESSOR':'SECRETARIO'}})]);
 if(role) await db.exec('SET ROLE '+role);
}
await db.exec(`INSERT INTO auth.users(id,email) VALUES ('${ids.admin}','admin@test.local'),('${ids.teacher}','teacher@test.local'),('${ids.secretary}','secretary@test.local'),('${ids.student}','12345678901@aluno.dcdigital.local');
 INSERT INTO public.escolas(id,nome) VALUES('${ids.school}','A'),('${ids.otherSchool}','B');
 INSERT INTO public.usuarios(id,email,nome_completo,cargo,escola_id) VALUES
 ('${ids.admin}','admin@test.local','Admin','ADMIN','${ids.school}'),('${ids.teacher}','teacher@test.local','Professor','PROFESSOR','${ids.school}'),('${ids.secretary}','secretary@test.local','Secretário','SECRETARIO','${ids.school}')
 ON CONFLICT(id) DO UPDATE SET cargo=excluded.cargo,escola_id=excluded.escola_id;
 INSERT INTO public.turmas(id,nome,turno,escola_id,ano_letivo) VALUES('${ids.class}','1º Ano A','Matutino','${ids.school}','2026'),('${ids.otherClass}','1º Ano B','Matutino','${ids.otherSchool}','2026');
 INSERT INTO public.professores(id,nome,email,usuario_id,disciplinas) VALUES('${ids.p}','P','teacher@test.local','${ids.teacher}',ARRAY['MAT','HIST']);
 INSERT INTO public.professor_horarios(professor_id,turma_id,escola_id,dia_semana,tempo_ordem,componente) VALUES('${ids.p}','${ids.class}','${ids.school}',1,1,'MAT');
 INSERT INTO public.alunos(id,escola_id,turma_id,nome,data_nascimento,nome_responsavel,telefone,endereco,cpf) VALUES
 ('${ids.a}','${ids.school}','${ids.class}','Aluno','2015-01-01','R','0','Rua','11111111111'),
 ('${ids.otherA}','${ids.otherSchool}','${ids.otherClass}','Outro','2015-01-01','R','0','Rua','12345678901');`);
const rejected = async (sql,pattern) => {
 try { await db.exec(sql); assert.fail('Expected rejection: '+sql); }
 catch(e) { if(e.code==='ERR_ASSERTION') throw e; if(pattern) assert.match(e.message,pattern); }
};
await asUser(ids.teacher);
await rejected(`INSERT INTO conteudos(turma_id,data,tempo,disciplina) VALUES('${ids.class}','2026-03-01','1','HIST')`,/row-level security/);
await db.exec(`INSERT INTO conteudos(turma_id,data,tempo,disciplina) VALUES('${ids.class}','2026-03-01','1','MAT')`);
await rejected(`INSERT INTO frequencias(turma_id,aluno_id,data,tempo,disciplina,status,participacao) VALUES('${ids.class}','${ids.otherA}','2026-03-01','1','MAT','P','Presencial')`,/matriculado/);
await asUser(ids.secretary);
await db.exec(`INSERT INTO fechamentos_bimestres(turma_id,disciplina,bimestre,status) VALUES('${ids.class}','MAT','1. BIMESTRE','FECHADO')`);
await asUser(ids.teacher);
await rejected(`UPDATE fechamentos_bimestres SET status='ABERTO' WHERE turma_id='${ids.class}'`,/reabrir/);
await rejected(`DELETE FROM conteudos WHERE turma_id='${ids.class}'`,/fechado/);
await rejected(`UPDATE conteudos SET data='2026-05-01' WHERE turma_id='${ids.class}'`,/fechado/);
await asUser(ids.secretary);
await db.exec(`DELETE FROM fechamentos_bimestres WHERE turma_id='${ids.class}'`);
await asUser(ids.teacher);
const payload={turma_id:ids.class,data:'2026-05-01',tempo:'1',disciplina:'MAT',objetos:[],habilidades:[],descricao:'v1',_expected_revision:0};
const op='50000000-0000-0000-0000-000000000001';
const invoke=async(body,operationId=op)=> (await db.query('SELECT apply_academic_mutation($1,$2,$3,$4) AS result',['conteudos','UPSERT',JSON.stringify(body),operationId])).rows[0].result;
const first=await invoke(payload); const replay=await invoke(payload); assert.deepEqual(first,replay);
const stale = await invoke({...payload,descricao:'stale'},'50000000-0000-0000-0000-000000000002');
assert.equal(stale.status, 'partial');
assert.ok(Array.isArray(stale.conflicts) && stale.conflicts.length >= 1);
const next=await invoke({...payload,descricao:'v2',_expected_revision:first[0].sync_revision},'50000000-0000-0000-0000-000000000003'); assert.ok(Number(next[0].sync_revision)>Number(first[0].sync_revision));
await asUser(ids.admin,'service_role');
await assert.rejects(()=>db.query('SELECT finalize_provisioned_user($1,$2,$3,$4,$5,$6)',[ids.secretary,ids.student,'12345678901@aluno.dcdigital.local','Student','ALUNO',ids.school]),/outra escola/);
await asUser(ids.admin,'');
assert.equal((await db.query('SELECT usuario_id FROM alunos WHERE id=$1',[ids.otherA])).rows[0].usuario_id,null);

// Complete positive provisioning, not just denial. Role and student link commit together.
await asUser(ids.admin,'service_role');
await db.query('SELECT finalize_provisioned_user($1,$2,$3,$4,$5,$6)',[ids.admin,ids.student,'12345678901@aluno.dcdigital.local','Student','ALUNO',ids.otherSchool]);
await asUser(ids.admin,'');
assert.equal((await db.query('SELECT usuario_id FROM alunos WHERE id=$1',[ids.otherA])).rows[0].usuario_id,ids.student);
assert.equal((await db.query('SELECT raw_app_meta_data FROM auth.users WHERE id=$1',[ids.student])).rows[0].raw_app_meta_data.role,'ALUNO');
await db.exec("INSERT INTO auth.users(id,email) VALUES('00000000-0000-0000-0000-000000000005','newteacher@test.local')");
await asUser(ids.admin,'service_role');
await db.query('SELECT finalize_provisioned_user($1,$2,$3,$4,$5,$6)',[ids.secretary,'00000000-0000-0000-0000-000000000005','newteacher@test.local','New teacher','PROFESSOR',ids.school]);
await asUser(ids.teacher);
// Deletion requires the exact snapshot, and recreating a natural key never reuses its revision.
const naturalKey=JSON.stringify([ids.class,payload.data,payload.tempo,payload.disciplina]).replaceAll(',',', ');
const erase=async(expected,operationId)=>db.query('SELECT apply_academic_mutation($1,$2,$3,$4)', ['conteudos','DELETE',JSON.stringify({...payload,_expected:{[naturalKey]:expected}}),operationId]);
const staleErase = (await erase(first[0].sync_revision,'50000000-0000-0000-0000-000000000004')).rows[0].apply_academic_mutation;
assert.equal(staleErase.status, 'partial');
await erase(next[0].sync_revision,'50000000-0000-0000-0000-000000000005');
const recreated=await invoke(payload,'50000000-0000-0000-0000-000000000006');
assert.ok(Number(recreated[0].sync_revision)>Number(next[0].sync_revision));
const staleAgain = await invoke({...payload,_expected_revision:first[0].sync_revision},'50000000-0000-0000-0000-000000000007');
assert.equal(staleAgain.status, 'partial');
// Evaluation deletion (including cascade) and changes to grades obey period closure.
const av=(await db.query("INSERT INTO avaliacoes(turma_id,tipo,data,instrumento,bimestre,valor_maximo,disciplina) VALUES($1,'AV01','2026-03-01','Prova','1. BIMESTRE',10,'MAT') RETURNING id",[ids.class])).rows[0].id;
await rejected(`INSERT INTO notas(avaliacao_id,aluno_id,valor) VALUES(${av},'${ids.a}',11)`,/valor|Nota|nota/);
await db.exec(`INSERT INTO notas(avaliacao_id,aluno_id,valor) VALUES(${av},'${ids.a}',7)`);
await asUser(ids.secretary);
await db.exec(`INSERT INTO fechamentos_bimestres(turma_id,disciplina,bimestre,status) VALUES('${ids.class}','MAT','1. BIMESTRE','FECHADO')`);
await asUser(ids.teacher);
await rejected(`DELETE FROM avaliacoes WHERE id=${av}`,/fechado/);
await rejected(`DELETE FROM notas WHERE avaliacao_id=${av}`,/fechado/);
// Revocation takes effect with an old professor claim still present in the JWT.
await asUser(ids.admin,'');
await db.exec(`UPDATE usuarios SET cargo='ALUNO' WHERE id='${ids.teacher}'`);
await asUser(ids.teacher);
await rejected(`INSERT INTO conteudos(turma_id,data,tempo,disciplina) VALUES('${ids.class}','2026-10-01','1','MAT')`,/row-level security/);

// Teste P1: lgpd_requests - direct insert by authenticated is forbidden
await asUser(ids.secretary);
await rejected(`INSERT INTO lgpd_requests(nome,email,tipo,mensagem,status) VALUES('Test','test@test.com','exclusao','msg','recebida')`, /permission denied/);

// Teste P1: sync_receipts - direct insert by authenticated is forbidden
await rejected(`INSERT INTO sync_receipts(user_id,operation_id,request,response) VALUES('${ids.secretary}','50000000-0000-0000-0000-000000000099','{}','[]')`, /permission denied/);

// Teste P1: Alunos CPF & matrícula uniqueness
await asUser(ids.admin, '');
await rejected(`INSERT INTO alunos(escola_id,turma_id,nome,data_nascimento,nome_responsavel,telefone,endereco,cpf) VALUES('${ids.school}','${ids.class}','Clone CPF','2015-01-01','R','0','Rua','111.111.111-11')`, /unique|duplicate|uq_alunos_cpf_limpo/);
await db.exec(`UPDATE alunos SET matricula='MAT-001' WHERE id='${ids.a}'`);
await rejected(`INSERT INTO alunos(escola_id,turma_id,nome,data_nascimento,nome_responsavel,telefone,endereco,matricula) VALUES('${ids.school}','${ids.class}','Clone Mat','2015-01-01','R','0','Rua','MAT-001')`, /unique|duplicate|uq_alunos_escola_matricula/);
// Mesma matrícula em outra escola é permitida:
await db.exec(`INSERT INTO alunos(id,escola_id,turma_id,nome,data_nascimento,nome_responsavel,telefone,endereco,matricula) VALUES('40000000-0000-0000-0000-000000000099','${ids.otherSchool}','${ids.otherClass}','Outro Mat','2015-01-01','R','0','Rua','MAT-001')`);

// Teste P1/P2: get_aluno_numero_chamada allowlist
const pendingUser = '00000000-0000-0000-0000-000000000008';
await db.exec(`INSERT INTO auth.users(id,email) VALUES('${pendingUser}','pending@test.local');
  INSERT INTO public.usuarios(id,email,nome_completo,cargo,escola_id) VALUES('${pendingUser}','pending@test.local','Pendente','PENDENTE','${ids.school}')
  ON CONFLICT(id) DO UPDATE SET cargo='PENDENTE',escola_id='${ids.school}';`);
await asUser(pendingUser);
await assert.rejects(() => db.query('SELECT get_aluno_numero_chamada($1)', [ids.a]), /Acesso negado/);

// Secretário da escola consulta aluno de sua escola
await asUser(ids.secretary);
const numChamada = (await db.query('SELECT get_aluno_numero_chamada($1) as n', [ids.a])).rows[0].n;
assert.equal(numChamada, 1);
// Secretário é bloqueado para aluno de outra escola
await assert.rejects(() => db.query('SELECT get_aluno_numero_chamada($1)', [ids.otherA]), /Acesso negado/);

// Teste P2: SECRETARIO gerencia currículo sem erro de RLS
await asUser(ids.secretary);
const unId = '70000000-0000-0000-0000-000000000001';
await db.exec(`INSERT INTO curriculo_unidades(id,modalidade,ano,disciplina,bimestre,nome) VALUES('${unId}','Fundamental','1º Ano','MAT','1. BIMESTRE','Unidade Teste')`);
await db.exec(`INSERT INTO curriculo_objetos(unidade_id,descricao) VALUES('${unId}','Objeto 1')`);
const objCount = (await db.query('SELECT count(*) as c FROM curriculo_objetos WHERE unidade_id=$1', [unId])).rows[0].c;
assert.equal(Number(objCount), 1);

// Teste P1: desvincular_professor_escola (atômico e com validação de escola)
await asUser(ids.admin, '');
await db.exec(`INSERT INTO professor_alocacoes(professor_id,escola_id,turno) VALUES('${ids.p}','${ids.school}','Matutino') ON CONFLICT DO NOTHING;`);
assert.equal((await db.query('SELECT count(*) as c FROM professor_horarios WHERE professor_id=$1 AND escola_id=$2', [ids.p, ids.school])).rows[0].c, 1);
assert.equal((await db.query('SELECT count(*) as c FROM professor_alocacoes WHERE professor_id=$1 AND escola_id=$2', [ids.p, ids.school])).rows[0].c, 1);

// Secretário de outra escola não pode desvincular
const otherSec = '00000000-0000-0000-0000-000000000009';
await db.exec(`INSERT INTO auth.users(id,email) VALUES('${otherSec}','othersec@test.local');
  INSERT INTO public.usuarios(id,email,nome_completo,cargo,escola_id) VALUES('${otherSec}','othersec@test.local','Outro Sec','SECRETARIO','${ids.otherSchool}')
  ON CONFLICT(id) DO UPDATE SET cargo='SECRETARIO',escola_id='${ids.otherSchool}';`);
await asUser(otherSec);
await assert.rejects(() => db.query('SELECT desvincular_professor_escola($1,$2)', [ids.p, ids.school]), /Permissão negada/);

// Secretário da própria escola desvincula horários e alocação atomicamente
await asUser(ids.secretary);
await db.query('SELECT desvincular_professor_escola($1,$2)', [ids.p, ids.school]);
assert.equal((await db.query('SELECT count(*) as c FROM professor_horarios WHERE professor_id=$1 AND escola_id=$2', [ids.p, ids.school])).rows[0].c, 0);
assert.equal((await db.query('SELECT count(*) as c FROM professor_alocacoes WHERE professor_id=$1 AND escola_id=$2', [ids.p, ids.school])).rows[0].c, 0);

// Teste Etapa 2: upsert_curriculo_unidade_com_objetos (atômico)
await asUser(pendingUser);
await assert.rejects(() => db.query('SELECT upsert_curriculo_unidade_com_objetos($1,$2,$3,$4,$5,$6,$7)', ['Fundamental','2º Ano','HIST','1. BIMESTRE','Unidade Hist', ['Obj 1', 'Obj 2'], false]), /Permissão negada/);

await asUser(ids.secretary);
const curId = (await db.query('SELECT upsert_curriculo_unidade_com_objetos($1,$2,$3,$4,$5,$6,$7) as id', ['Fundamental','2º Ano','HIST','1. BIMESTRE','Unidade Hist', ['Obj 1', 'Obj 2'], false])).rows[0].id;
assert.ok(curId);
const objs = (await db.query('SELECT count(*) as c FROM curriculo_objetos WHERE unidade_id=$1', [curId])).rows[0].c;
assert.equal(Number(objs), 2);

// Substituição atômica de currículo
const curIdNew = (await db.query('SELECT upsert_curriculo_unidade_com_objetos($1,$2,$3,$4,$5,$6,$7) as id', ['Fundamental','2º Ano','HIST','1. BIMESTRE','Unidade Hist Substituida', ['Obj Novo'], true])).rows[0].id;
assert.notEqual(curId, curIdNew);
const oldCheck = (await db.query('SELECT count(*) as c FROM curriculo_unidades WHERE id=$1', [curId])).rows[0].c;
assert.equal(Number(oldCheck), 0);
const newObjs = (await db.query('SELECT count(*) as c FROM curriculo_objetos WHERE unidade_id=$1', [curIdNew])).rows[0].c;
assert.equal(Number(newObjs), 1);

// Teste Etapa 2: criar_professor_com_alocacao (atômico)
await asUser(otherSec);
await assert.rejects(() => db.query('SELECT criar_professor_com_alocacao($1,$2,$3,$4,$5,$6,$7)', ['Prof Teste', 'proftest@test.local', '1199999999', 'Geral', ['MAT'], ids.school, 'Tarde']), /Permissão negada/);

await asUser(ids.secretary);
const profCriado = (await db.query('SELECT criar_professor_com_alocacao($1,$2,$3,$4,$5,$6,$7) as p', ['Prof Teste', 'proftest@test.local', '1199999999', 'Geral', ['MAT'], ids.school, 'Tarde'])).rows[0].p;
assert.ok(profCriado.id);
const alocCount = (await db.query('SELECT count(*) as c FROM professor_alocacoes WHERE professor_id=$1 AND escola_id=$2', [profCriado.id, ids.school])).rows[0].c;
assert.equal(Number(alocCount), 1);

// Teste Etapa 3: cleanup_sync_receipts
await asUser(ids.secretary);
await assert.rejects(() => db.query('SELECT cleanup_sync_receipts(30)'), /Apenas administradores/);
await asUser(ids.admin, '');
const deletedReceipts = (await db.query('SELECT cleanup_sync_receipts(30) as d')).rows[0].d;
assert.equal(typeof Number(deletedReceipts), 'number');

// Teste Reauditoria 1: sync_receipts não pode ser falsificado diretamente via RPC record_sync_receipt
await asUser(ids.secretary);
await assert.rejects(
  () => db.query('SELECT record_sync_receipt($1,$2,$3,$4)', [ids.secretary, '50000000-0000-0000-0000-000000000099', '{}', '[]']),
  /Acesso negado/
);

// Teste Reauditoria 2: Fail-closed em SECURITY DEFINER contra usuário sem registro em usuarios (v_role IS NULL)
await db.exec('RESET ROLE');
const ghostUser = '00000000-0000-0000-0000-000000000099';
await db.exec(`INSERT INTO auth.users(id,email) VALUES('${ghostUser}','ghost@test.local') ON CONFLICT DO NOTHING;
  DELETE FROM public.usuarios WHERE id='${ghostUser}';`);
await asUser(ghostUser);
await assert.rejects(
  () => db.query('SELECT upsert_curriculo_unidade_com_objetos($1,$2,$3,$4,$5,$6,$7)', ['Fundamental','3º Ano','GEO','1. BIMESTRE','Ghost Unidade', ['Obj Ghost'], false]),
  /Permissão negada/
);
await assert.rejects(
  () => db.query('SELECT liberar_transferencia_aluno($1)', [ids.a]),
  /Apenas Administrador ou Secretário/
);
await assert.rejects(
  () => db.query('SELECT receber_transferencia_aluno($1,$2,$3,$4)', ['TRF-999', '12345', '2015-01-01', ids.class]),
  /Apenas Administrador ou Secretário/
);
await assert.rejects(
  () => db.query('SELECT remanejar_aluno($1,$2)', [ids.a, ids.class]),
  /Sem permissão para remanejar/
);

// Teste Reauditoria 3: criar_professor_com_alocacao preserva cpf, vinculo e status
await asUser(ids.secretary);
const profCompleto = (await db.query('SELECT criar_professor_com_alocacao($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) as p', [
  'Prof Completo', 'completo@test.local', '1188888888', 'Exatas', ['MAT'], ids.school, 'Manhã', '222.222.222-22', 'Contratado', 'Ativo'
])).rows[0].p;
assert.equal(profCompleto.cpf, '222.222.222-22');
assert.equal(profCompleto.vinculo, 'Contratado');
assert.equal(profCompleto.status, 'Ativo');

// Teste Reauditoria 4: import_curriculo_batch em transação única com p_items
await asUser(ids.secretary);
const batchData = [
  { modalidade: 'Fundamental', ano: '4º Ano', disciplina: 'CIEN', bimestre: '1. BIMESTRE', nome: 'Ciências 1', objetos: ['Terra', 'Água'] },
  { modalidade: 'Fundamental', ano: '4º Ano', disciplina: 'CIEN', bimestre: '2. BIMESTRE', nome: 'Ciências 2', objetos: ['Corpo Humano'] }
];
const importedCount = (await db.query('SELECT import_curriculo_batch(p_items := $1, p_substituir := $2) as count', [JSON.stringify(batchData), false])).rows[0].count;
assert.equal(importedCount, 2);

// Teste Reauditoria 5: update_curriculo_unidade_com_objetos atômico com p_unidade_id (contrato frontend)
const unitToUpdate = (await db.query("SELECT id FROM curriculo_unidades WHERE ano='4º Ano' AND bimestre='1. BIMESTRE' LIMIT 1")).rows[0].id;
await db.query('SELECT update_curriculo_unidade_com_objetos(p_unidade_id := $1, p_modalidade := $2, p_ano := $3, p_disciplina := $4, p_bimestre := $5, p_nome := $6, p_objetos := $7)', [
  unitToUpdate, 'Fundamental', '4º Ano', 'CIEN', '1. BIMESTRE', 'Ciências 1 Atualizada', ['Novo Objeto A', 'Novo Objeto B']
]);
const updatedObjs = (await db.query('SELECT count(*) as c FROM curriculo_objetos WHERE unidade_id=$1', [unitToUpdate])).rows[0].c;
assert.equal(Number(updatedObjs), 2);

// Teste Reauditoria 6: delete_curriculo_unidade com cascade e p_unidade_id
await db.query('SELECT delete_curriculo_unidade(p_unidade_id := $1)', [unitToUpdate]);
assert.equal((await db.query('SELECT count(*) as c FROM curriculo_unidades WHERE id=$1', [unitToUpdate])).rows[0].c, 0);
assert.equal((await db.query('SELECT count(*) as c FROM curriculo_objetos WHERE unidade_id=$1', [unitToUpdate])).rows[0].c, 0);

// Falha de login não é mais gravada por anônimo. Só sessão autenticada chama a RPC.
await db.exec('RESET ROLE');
await db.exec('SET ROLE anon');
await rejected(`INSERT INTO security_logs(action,user_agent,entity) VALUES('LOGIN','bot','auth')`, /permission denied/);
await rejected(`SELECT log_login_failure('s1:testfailurehash', 'Mozilla/5.0 Test')`, /permission denied/);
await asUser(ids.teacher);
await db.query('SELECT log_login_failure($1, $2)', ['s1:testfailurehash', 'Mozilla/5.0 Test']);
await db.exec('RESET ROLE');
const failureLog = (await db.query("SELECT * FROM security_logs WHERE action='LOGIN_FAILED' AND user_email='s1:testfailurehash'")).rows[0];
assert.ok(failureLog);
assert.equal(failureLog.action, 'LOGIN_FAILED');

// Hardening security_logs: autenticado só pode gravar evento com o PRÓPRIO user_id.
// Policy atual: WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid()).
await asUser(ids.teacher);
// (a) Próprio user_id: permitido
await db.exec(`INSERT INTO security_logs(action,user_id,user_agent) VALUES('LOGIN','${ids.teacher}','own-agent')`);
// (b) user_id de terceiro (spoofing): bloqueado por RLS
await rejected(`INSERT INTO security_logs(action,user_id,user_agent) VALUES('LOGIN','${ids.secretary}','spoof-agent')`, /row-level security/);
// (c) user_id nulo: bloqueado (policy exige NOT NULL)
await rejected(`INSERT INTO security_logs(action,user_id,user_agent) VALUES('LOGIN',NULL,'null-agent')`, /row-level security/);
await db.exec('RESET ROLE');
assert.equal((await db.query(`SELECT count(*)::int AS c FROM security_logs WHERE user_agent='own-agent' AND user_id='${ids.teacher}'`)).rows[0].c, 1);
assert.equal((await db.query("SELECT count(*)::int AS c FROM security_logs WHERE user_agent IN ('spoof-agent','null-agent')")).rows[0].c, 0);

// Teste Reauditoria 8: Idempotência permanente via sync_idempotency_keys mesmo após expiração de sync_receipts
await db.exec('RESET ROLE');
await db.exec(`UPDATE public.usuarios SET cargo='PROFESSOR' WHERE id='${ids.teacher}'`);
await db.exec(`INSERT INTO public.professor_alocacoes(professor_id,escola_id,turno) VALUES('${ids.p}','${ids.school}','Matutino') ON CONFLICT DO NOTHING;
  INSERT INTO public.professor_horarios(professor_id,turma_id,escola_id,dia_semana,tempo_ordem,componente) VALUES('${ids.p}','${ids.class}','${ids.school}',1,1,'MAT') ON CONFLICT DO NOTHING;`);
await asUser(ids.teacher);
const opTestId = '60000000-0000-0000-0000-000000000001';
const contPayload = {
  turma_id: ids.class,
  data: '2026-06-01',
  tempo: '1',
  disciplina: 'MAT',
  objetos: ['Geometria'],
  habilidades: [],
  descricao: 'Aula de Geometria',
  _expected_revision: 0
};
const firstIdem = (await db.query('SELECT apply_academic_mutation($1, $2, $3, $4) AS res', ['conteudos', 'UPSERT', JSON.stringify(contPayload), opTestId])).rows[0].res;

const idempRow = (await db.query('SELECT * FROM sync_idempotency_keys WHERE operation_id=$1', [opTestId])).rows[0];
assert.ok(idempRow);
assert.equal(idempRow.entity, 'conteudos');

// Purgar o recibo simulando expiração de TTL
await db.exec('RESET ROLE');
await db.query('DELETE FROM sync_receipts WHERE operation_id=$1', [opTestId]);

// Reenviar a mesma operação: chave de idempotência permanente impede duplicação
await asUser(ids.teacher);
const replayRes = (await db.query('SELECT apply_academic_mutation($1, $2, $3, $4) as res', ['conteudos', 'UPSERT', JSON.stringify(contPayload), opTestId])).rows[0].res;
assert.deepEqual(replayRes, firstIdem);
assert.equal((await db.query("SELECT count(*)::int AS c FROM conteudos WHERE data='2026-06-01' AND turma_id=$1", [ids.class])).rows[0].c, 1);

// Teste Reauditoria 9: Ordenação determinística de múltiplos locks de turma
const sortedLocks = (await db.query(`
  SELECT DISTINCT tid
  FROM (
    SELECT '20000000-0000-0000-0000-000000000002' AS tid
    UNION ALL
    SELECT '20000000-0000-0000-0000-000000000001' AS tid
    UNION ALL
    SELECT '20000000-0000-0000-0000-000000000003' AS tid
    UNION ALL
    SELECT '20000000-0000-0000-0000-000000000001' AS tid
  ) s
  WHERE tid IS NOT NULL AND tid <> ''
  ORDER BY tid ASC
`)).rows.map(r => r.tid);
assert.deepEqual(sortedLocks, [
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003'
]);

// Auditoria 2026-10-13: gestor, aluno e professor não atravessam escola nem turma.
const gestor = '00000000-0000-0000-0000-000000000006';
const profOutraEscola = '30000000-0000-0000-0000-000000000002';
const turmaMesmaEscola = '20000000-0000-0000-0000-000000000003';
await db.exec('RESET ROLE');
await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: ids.admin, role: 'authenticated', email: 'admin@test.local' })]);
await db.exec(`
 INSERT INTO auth.users(id,email) VALUES ('${gestor}','gestor@test.local');
 INSERT INTO public.usuarios(id,email,nome_completo,cargo,escola_id) VALUES
  ('${gestor}','gestor@test.local','Gestor A','GESTOR','${ids.school}')
  ON CONFLICT (id) DO UPDATE SET cargo='GESTOR', escola_id=EXCLUDED.escola_id, nome_completo=EXCLUDED.nome_completo, email=EXCLUDED.email;
 INSERT INTO public.professores(id,nome,email,cpf,telefone) VALUES
  ('${profOutraEscola}','Docente B','outraprof@test.local','99999999999','85999990000');
 INSERT INTO public.professor_alocacoes(professor_id,escola_id,turno) VALUES
  ('${profOutraEscola}','${ids.otherSchool}','Manhã'),
  ('${ids.p}','${ids.school}','Manhã');
 UPDATE public.professores SET cpf='11111111111' WHERE id='${ids.p}';
 INSERT INTO public.professores(id,nome,email) VALUES
  ('30000000-0000-0000-0000-000000000003','Colega','colega@test.local');
 INSERT INTO public.professor_horarios(professor_id,turma_id,escola_id,dia_semana,tempo_ordem,componente)
  VALUES ('${profOutraEscola}','${ids.otherClass}','${ids.otherSchool}',2,1,'PORT'),
         ('30000000-0000-0000-0000-000000000003','${ids.class}','${ids.school}',3,1,'CIEN');
 INSERT INTO public.turmas(id,nome,turno,escola_id,ano_letivo) VALUES
  ('${turmaMesmaEscola}','2º Ano A','Matutino','${ids.school}','2026');
 INSERT INTO public.avaliacoes(turma_id,tipo,data,disciplina) VALUES
  ('${turmaMesmaEscola}','Prova','2026-04-01','HIST'),
  ('${ids.class}','Prova','2026-04-01','MAT');
 INSERT INTO public.conteudos(turma_id,data,tempo,disciplina,descricao) VALUES
  ('${turmaMesmaEscola}','2026-04-02','1','HIST','conteudo de outra turma');
 INSERT INTO public.fechamentos_bimestres(turma_id,disciplina,bimestre,status) VALUES
  ('${turmaMesmaEscola}','HIST','1. BIMESTRE','ABERTO');
`);

await asUser(gestor);
assert.equal((await db.query('SELECT id FROM professores WHERE id=$1', [profOutraEscola])).rows.length, 0);
await rejected(`SELECT cpf FROM professores WHERE id='${ids.p}'`);
assert.equal((await db.query(`SELECT cpf FROM public.cpfs_de_professores(ARRAY['${ids.p}']::uuid[])`)).rows[0].cpf, '111');
assert.equal((await db.query(`SELECT cpf FROM public.cpfs_de_professores(ARRAY['${profOutraEscola}']::uuid[])`)).rows.length, 0);
assert.equal((await db.query('SELECT id FROM professores WHERE id=$1', [ids.p])).rows.length, 1);
assert.equal((await db.query('SELECT id FROM professor_alocacoes WHERE escola_id=$1', [ids.otherSchool])).rows.length, 0);
assert.equal((await db.query('SELECT id FROM professor_horarios WHERE escola_id=$1', [ids.otherSchool])).rows.length, 0);
assert.ok((await db.query('SELECT id FROM professor_alocacoes WHERE escola_id=$1', [ids.school])).rows.length >= 1);

await asUser(ids.student);
assert.equal((await db.query('SELECT id, email, telefone FROM professores')).rows.length, 0);
await rejected('SELECT cpf FROM professores');
assert.equal((await db.query('SELECT id FROM professor_alocacoes')).rows.length, 0);
assert.equal((await db.query('SELECT id FROM professor_horarios')).rows.length, 0);

await asUser(ids.teacher);
assert.equal((await db.query('SELECT id FROM professores WHERE id=$1', [ids.p])).rows.length, 1);
assert.equal((await db.query('SELECT id FROM professores WHERE id=$1', [profOutraEscola])).rows.length, 0);
await rejected(`SELECT cpf FROM professores WHERE id='${ids.p}'`);
assert.equal((await db.query(`SELECT cpf FROM public.cpfs_de_professores(ARRAY['${ids.p}']::uuid[])`)).rows[0].cpf, '11111111111');
const componentes = (await db.query(`SELECT public.disciplinas_da_turma('${ids.class}') AS nomes`)).rows[0].nomes;
assert.ok(componentes.includes('CIEN'));
assert.equal((await db.query('SELECT id FROM avaliacoes WHERE turma_id=$1', [turmaMesmaEscola])).rows.length, 0);
assert.equal((await db.query('SELECT id FROM conteudos WHERE turma_id=$1', [turmaMesmaEscola])).rows.length, 0);
assert.equal((await db.query('SELECT id FROM fechamentos_bimestres WHERE turma_id=$1', [turmaMesmaEscola])).rows.length, 0);
assert.ok((await db.query('SELECT id FROM avaliacoes WHERE turma_id=$1', [ids.class])).rows.length >= 1);

await asUser(ids.secretary);
await rejected(`INSERT INTO professores(nome,email,cpf) VALUES ('Invasor','invasor@test.local','12312312312')`);
assert.equal((await db.query('SELECT id FROM professores WHERE id=$1', [ids.p])).rows.length, 1);
assert.equal((await db.query('SELECT id FROM professores WHERE id=$1', [profOutraEscola])).rows.length, 0);
assert.equal((await db.query(`SELECT cpf FROM public.cpfs_de_professores(ARRAY['${ids.p}']::uuid[])`)).rows[0].cpf, '111');
assert.equal((await db.query(`SELECT cpf FROM public.cpfs_de_professores(ARRAY['${profOutraEscola}']::uuid[])`)).rows.length, 0);
await rejected(`SELECT public.definir_cpf_professor('${ids.p}','22222222222')`);

await asUser(ids.admin);
await rejected(`SELECT cpf FROM professores WHERE id='${profOutraEscola}'`);
assert.equal((await db.query(`SELECT cpf FROM public.cpfs_de_professores(ARRAY['${profOutraEscola}']::uuid[])`)).rows[0].cpf, '99999999999');
await db.query(`SELECT public.definir_cpf_professor('${profOutraEscola}','88888888888')`);
assert.equal((await db.query(`SELECT cpf FROM public.cpfs_de_professores(ARRAY['${profOutraEscola}']::uuid[])`)).rows[0].cpf, '88888888888');

await db.exec('RESET ROLE');
for (let i = 0; i < 10; i++) {
  assert.equal((await db.query(`SELECT public.reservar_criacao_de_conta('${ids.admin}') AS ok`)).rows[0].ok, true);
}
assert.equal((await db.query(`SELECT public.reservar_criacao_de_conta('${ids.admin}') AS ok`)).rows[0].ok, false);
await asUser(ids.teacher);
await rejected(`SELECT public.reservar_criacao_de_conta('${ids.teacher}')`);
await db.exec('RESET ROLE');
await rejected(`INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('00000000-0000-0000-0000-000000000099','publico@test.local','{"role":"ADMIN"}')`);

// ----------------------------------------------------------------
// Auditoria 2026-10-20: isolamento de LEITURA cross-escola.
// Complementa os testes de escrita já existentes com garantias de SELECT
// para notas (dados acadêmicos) e usuarios (PII). get_user_role() usa o
// cargo institucional (tabela usuarios), não o claim do JWT.
// ----------------------------------------------------------------
// Seed de uma nota na escola B via service_role (ignora RLS, respeita triggers).
await asUser(ids.admin, 'service_role');
const avB = (await db.query("INSERT INTO avaliacoes(turma_id,tipo,data,instrumento,bimestre,valor_maximo,disciplina) VALUES($1,'AV01','2026-03-01','Prova','1. BIMESTRE',10,'PORT') RETURNING id", [ids.otherClass])).rows[0].id;
await db.query('INSERT INTO notas(avaliacao_id,aluno_id,valor) VALUES($1,$2,8)', [avB, ids.otherA]);

// Conta linhas visíveis sob a RLS do papel atual. Usamos count(*) em vez de
// `SELECT 1 ... WHERE $1`, que expõe um quirk do PGlite sob RLS; o número é a
// fonte da verdade sobre o que o papel realmente enxerga.
const visNota = async (alunoId) => (await db.query('SELECT count(*)::int c FROM notas WHERE aluno_id=$1', [alunoId])).rows[0].c;
const visUser = async (userId) => (await db.query('SELECT count(*)::int c FROM usuarios WHERE id=$1', [userId])).rows[0].c;

// notas: GESTOR da escola A vê nota da própria escola, nunca a da escola B.
await asUser(gestor);
assert.ok(await visNota(ids.a) >= 1);
assert.equal(await visNota(ids.otherA), 0);

// notas: PROFESSOR com acesso à turma da escola A não enxerga a escola B.
await asUser(ids.teacher);
assert.ok(await visNota(ids.a) >= 1);
assert.equal(await visNota(ids.otherA), 0);

// notas: ALUNO vê só as próprias; nunca as de um aluno de outra escola.
await asUser(ids.student);
assert.ok(await visNota(ids.otherA) >= 1);
assert.equal(await visNota(ids.a), 0);

// usuarios (PII): SECRETARIO da escola A não lê staff da escola B; lê o próprio registro.
await asUser(ids.secretary);
assert.equal(await visUser(otherSec), 0);
assert.equal(await visUser(ids.secretary), 1);

// usuarios (PII): PROFESSOR não lê staff de outra escola; lê o próprio registro.
await asUser(ids.teacher);
assert.equal(await visUser(otherSec), 0);
assert.equal(await visUser(ids.teacher), 1);

// Seed de frequências nas duas escolas (service_role; disciplinas sem bimestre fechado).
await asUser(ids.admin, 'service_role');
await db.query("INSERT INTO frequencias(turma_id,aluno_id,data,tempo,disciplina,status,participacao) VALUES($1,$2,'2026-03-01','1','CIEN','P','Presencial')", [ids.class, ids.a]);
await db.query("INSERT INTO frequencias(turma_id,aluno_id,data,tempo,disciplina,status,participacao) VALUES($1,$2,'2026-03-01','1','PORT','P','Presencial')", [ids.otherClass, ids.otherA]);

// Conta linhas visíveis sob a RLS do papel atual (count(*) evita um quirk do
// PGlite com `SELECT 1 ... WHERE $1` sob RLS; o número é a fonte da verdade).
const visFreq = async (alunoId) => (await db.query('SELECT count(*)::int c FROM frequencias WHERE aluno_id=$1', [alunoId])).rows[0].c;
const visAluno = async (alunoId) => (await db.query('SELECT count(*)::int c FROM alunos WHERE id=$1', [alunoId])).rows[0].c;

// frequencias: GESTOR vê a própria escola, nunca a outra.
await asUser(gestor);
assert.ok(await visFreq(ids.a) >= 1);
assert.equal(await visFreq(ids.otherA), 0);

// frequencias: PROFESSOR com acesso à turma vê a própria escola, nunca a outra.
await asUser(ids.teacher);
assert.ok(await visFreq(ids.a) >= 1);
assert.equal(await visFreq(ids.otherA), 0);

// frequencias: ALUNO vê só as próprias faltas, nunca as de outra escola.
await asUser(ids.student);
assert.ok(await visFreq(ids.otherA) >= 1);
assert.equal(await visFreq(ids.a), 0);

// alunos (PII: CPF/endereço/responsável): isolamento por escola/turma/propriedade.
await asUser(gestor);
assert.ok(await visAluno(ids.a) >= 1);
assert.equal(await visAluno(ids.otherA), 0);
await asUser(ids.teacher);
assert.ok(await visAluno(ids.a) >= 1);
assert.equal(await visAluno(ids.otherA), 0);
await asUser(ids.student);
assert.ok(await visAluno(ids.otherA) >= 1);
assert.equal(await visAluno(ids.a), 0);
await db.exec('RESET ROLE');

console.log('RLS isolation, closed periods, membership, idempotency, revision conflicts and cross-school provisioning: passed.');
console.log('Cross-school read isolation (notas, frequencias, alunos PII, usuarios PII): passed.');
console.log('Audit P1/P2 fixes: teacher atomic deallocation, lgpd direct insert revocation, student uniqueness, and authorization hardening passed.');
console.log('Audit Etapa 2/3: atomic curriculum upsert, atomic professor creation, sync retention, and granular locks passed.');
console.log('Reaudit final fixes: fail-closed transfer RPCs, named param curriculum contract, login failure logging, permanent idempotency, and deterministic locks passed.');
await db.close();


