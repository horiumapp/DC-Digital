import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iaeisumzwxhwioufgliu.supabase.co',
  '***REMOVED_ANON_KEY***'
);

// Verificar estrutura das tabelas que existem
const tabelas = [
  'alunos', 'turmas', 'escolas', 'frequencias', 'conteudos',
  'avaliacoes', 'notas', 'professores', 'professor_horarios', 'professor_alocacoes'
];

console.log('=== VERIFICAÇÃO DE ESTRUTURA ===\n');

for (const tabela of tabelas) {
  const { data, error } = await supabase.from(tabela).select('*').limit(0);
  if (error && error.code === 'PGRST204') {
    console.log(`❌ ${tabela} → NÃO EXISTE ou sem acesso`);
  } else if (error) {
    console.log(`? ${tabela} → Erro: ${error.code} ${error.message}`);
  } else {
    console.log(`✅ ${tabela} → EXISTE`);
  }
}

// Verificar colunas de professor_horarios (que tem dados)
const { data: sample } = await supabase.from('professor_horarios').select('*').limit(1);
if (sample && sample.length > 0) {
  console.log('\nColunas professor_horarios:', Object.keys(sample[0]).join(', '));
}

const { data: sample2 } = await supabase.from('professor_alocacoes').select('*').limit(1);
if (sample2 && sample2.length > 0) {
  console.log('Colunas professor_alocacoes:', Object.keys(sample2[0]).join(', '));
}

// Verificar tipo de ID (UUID ou integer) para cada tabela
for (const tabela of tabelas) {
  const { data, error } = await supabase.from(tabela).select('id').limit(1);
  if (!error && data && data.length > 0) {
    console.log(`\n${tabela}.id sample: ${data[0].id} (type: ${typeof data[0].id})`);
  }
}
