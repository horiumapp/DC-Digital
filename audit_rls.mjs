import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iaeisumzwxhwioufgliu.supabase.co',
  '***REMOVED_ANON_KEY***'
);

console.log('=== AUDITORIA RLS DETALHADA - DC DIGITAL ===\n');

// 1. Verificar RLS status via rpc (se existir)
console.log('--- 1. DADOS EXPOSTOS SEM AUTENTICAÇÃO ---\n');

// Professor Horarios - já sabemos que está exposta
const { data: horarios } = await supabase.from('professor_horarios').select('*').limit(5);
if (horarios && horarios.length > 0) {
  console.log(`🔴 professor_horarios: ${horarios.length} registros expostos`);
  console.log('   Amostra:', JSON.stringify(horarios[0], null, 2));
}

// Professor Alocações
const { data: alocacoes } = await supabase.from('professor_alocacoes').select('*').limit(5);
if (alocacoes && alocacoes.length > 0) {
  console.log(`\n🔴 professor_alocacoes: ${alocacoes.length} registros expostos`);
  console.log('   Amostra:', JSON.stringify(alocacoes[0], null, 2));
}

// 2. Teste de ESCRITA (INSERT) em cada tabela sem auth
console.log('\n--- 2. TESTES DE ESCRITA SEM AUTH ---\n');

const writeTests = [
  { table: 'escolas', data: { nome: 'AUDIT_TEST', status: 'Ativa', distrito: 'TESTE', inep: '0000000', diretor: 'TESTE' } },
  { table: 'turmas', data: { nome: 'AUDIT_TEST', turno: 'Manhã', ano_letivo: '2026' } },
  { table: 'professores', data: { nome: 'AUDIT_TEST', email: 'audit@test.com', cpf: '000.000.000-00' } },
  { table: 'conteudos', data: { data: '2026-01-01', tempo: '1º TEMPO', descricao: 'AUDIT_TEST', disciplina: 'TESTE' } },
];

for (const test of writeTests) {
  const { data, error } = await supabase.from(test.table).insert([test.data]).select();
  if (error) {
    console.log(`✅ ${test.table.padEnd(25)} INSERT → BLOQUEADO (${error.code})`);
  } else {
    console.log(`🔴 ${test.table.padEnd(25)} INSERT → VULNERÁVEL! Registro criado com ID: ${data?.[0]?.id}`);
    // Limpar registro de teste
    if (data?.[0]?.id) {
      await supabase.from(test.table).delete().eq('id', data[0].id);
      console.log(`   → Registro de teste removido`);
    }
  }
}

// 3. Teste de UPDATE sem auth
console.log('\n--- 3. TESTES DE UPDATE SEM AUTH ---\n');

const updateTests = ['alunos', 'turmas', 'escolas', 'professores', 'frequencias', 'notas', 'avaliacoes', 'conteudos'];
for (const table of updateTests) {
  const { error } = await supabase.from(table).update({ nome: 'HACKED' }).eq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.log(`✅ ${table.padEnd(25)} UPDATE → BLOQUEADO (${error.code})`);
  } else {
    console.log(`🔴 ${table.padEnd(25)} UPDATE → ACEITO (sem erro, mas talvez 0 linhas afetadas)`);
  }
}

// 4. Teste de DELETE sem auth
console.log('\n--- 4. TESTES DE DELETE SEM AUTH ---\n');

for (const table of updateTests) {
  const { error } = await supabase.from(table).delete().eq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.log(`✅ ${table.padEnd(25)} DELETE → BLOQUEADO (${error.code})`);
  } else {
    console.log(`🔴 ${table.padEnd(25)} DELETE → ACEITO (sem erro, provavelmente 0 linhas afetadas)`);
  }
}

console.log('\n=== FIM DA AUDITORIA DETALHADA ===');
