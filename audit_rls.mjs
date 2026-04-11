import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iaeisumzwxhwioufgliu.supabase.co',
  '***REMOVED_ANON_KEY***'
);

// Tabelas usadas pelo frontend
const tabelas = [
  'alunos', 'turmas', 'escolas', 'frequencias', 'conteudos',
  'avaliacoes', 'notas', 'professores', 'professor_horarios', 'professor_alocacoes'
];

console.log('=== AUDITORIA RLS - DC DIGITAL ===\n');
console.log('Teste: Tentando ler dados SEM autenticação (anon key)\n');

for (const tabela of tabelas) {
  const { data, error, count } = await supabase
    .from(tabela)
    .select('*', { count: 'exact', head: false })
    .limit(1);

  if (error) {
    console.log(`✅ ${tabela.padEnd(25)} → BLOQUEADO (${error.code}: ${error.message.slice(0, 60)})`);
  } else {
    const rowCount = data?.length || 0;
    if (rowCount > 0) {
      console.log(`🔴 ${tabela.padEnd(25)} → EXPOSTA! ${rowCount} registro(s) acessível(is) sem auth`);
      // Mostrar colunas disponíveis
      console.log(`   Colunas visíveis: ${Object.keys(data[0]).join(', ')}`);
    } else {
      console.log(`⚠️  ${tabela.padEnd(25)} → Acessível mas vazia (0 registros)`);
    }
  }
}

console.log('\n--- Teste de ESCRITA sem autenticação ---\n');

// Tentar inserir um registro falso em "alunos"
const { error: insertErr } = await supabase
  .from('alunos')
  .insert([{ nome: 'TESTE_AUDIT_DELETE_ME', turma_id: '99999' }]);

if (insertErr) {
  console.log(`✅ alunos INSERT              → BLOQUEADO (${insertErr.code}: ${insertErr.message.slice(0, 80)})`);
} else {
  console.log(`🔴 alunos INSERT              → VULNERÁVEL! Inserção sem auth permitida`);
  // Limpar o registro de teste
  await supabase.from('alunos').delete().eq('nome', 'TESTE_AUDIT_DELETE_ME');
}

// Tentar deletar sem auth
const { error: deleteErr } = await supabase
  .from('frequencias')
  .delete()
  .eq('turma_id', '99999_fake');

if (deleteErr) {
  console.log(`✅ frequencias DELETE         → BLOQUEADO (${deleteErr.code}: ${deleteErr.message.slice(0, 80)})`);
} else {
  console.log(`🔴 frequencias DELETE         → VULNERÁVEL! Deleção sem auth permitida`);
}

console.log('\n=== FIM DA AUDITORIA ===');
