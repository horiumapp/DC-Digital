import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iaeisumzwxhwioufgliu.supabase.co',
  '***REMOVED_ANON_KEY***'
);

const tabelas = [
  'alunos', 'turmas', 'escolas', 'frequencias', 'conteudos',
  'avaliacoes', 'notas', 'professores', 'professor_horarios', 
  'professor_alocacoes', 'usuarios'
];

console.log('=== VERIFICAÇÃO PÓS-CORREÇÃO — DC DIGITAL ===\n');

let vulneraveis = 0;
let protegidas = 0;

// 1. Leitura sem auth
console.log('--- SELECT sem autenticação ---\n');
for (const t of tabelas) {
  const { data, error } = await supabase.from(t).select('*').limit(1);
  if (error) {
    console.log(`✅ ${t.padEnd(25)} → BLOQUEADO`);
    protegidas++;
  } else if (data && data.length > 0) {
    console.log(`🔴 ${t.padEnd(25)} → EXPOSTA! (${data.length} registros)`);
    vulneraveis++;
  } else {
    console.log(`✅ ${t.padEnd(25)} → BLOQUEADO (0 resultados retornados)`);
    protegidas++;
  }
}

// 2. UPDATE sem auth
console.log('\n--- UPDATE sem autenticação ---\n');
for (const t of tabelas) {
  const { error } = await supabase.from(t).update({ id: '00000000-0000-0000-0000-000000000000' }).eq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.log(`✅ ${t.padEnd(25)} → BLOQUEADO`);
    protegidas++;
  } else {
    console.log(`🔴 ${t.padEnd(25)} → ACEITO`);
    vulneraveis++;
  }
}

// 3. DELETE sem auth  
console.log('\n--- DELETE sem autenticação ---\n');
for (const t of tabelas) {
  const { error } = await supabase.from(t).delete().eq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.log(`✅ ${t.padEnd(25)} → BLOQUEADO`);
    protegidas++;
  } else {
    console.log(`🔴 ${t.padEnd(25)} → ACEITO`);
    vulneraveis++;
  }
}

// 4. INSERT sem auth
console.log('\n--- INSERT sem autenticação ---\n');
for (const t of ['escolas', 'turmas', 'professores', 'alunos']) {
  const { error } = await supabase.from(t).insert([{ nome: 'AUDIT_TEST' }]);
  if (error) {
    console.log(`✅ ${t.padEnd(25)} → BLOQUEADO`);
    protegidas++;
  } else {
    console.log(`🔴 ${t.padEnd(25)} → VULNERÁVEL!`);
    vulneraveis++;
  }
}

console.log('\n========================================');
console.log(`RESULTADO: ${protegidas} operações BLOQUEADAS, ${vulneraveis} VULNERÁVEIS`);
console.log(vulneraveis === 0 ? '✅ SISTEMA SEGURO!' : '🔴 AINDA HÁ VULNERABILIDADES!');
console.log('========================================');
