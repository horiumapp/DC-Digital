import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iaeisumzwxhwioufgliu.supabase.co',
  '***REMOVED_ANON_KEY***'
);

// Tentar descobrir tabelas via REST API tentando acessar cada uma
const possibleTables = [
  // As 10 que já conhecemos
  'alunos', 'turmas', 'escolas', 'frequencias', 'conteudos',
  'avaliacoes', 'notas', 'professores', 'professor_horarios', 'professor_alocacoes',
  // Possíveis tabelas adicionais baseadas nas migrações visíveis na sidebar
  'usuarios', 'users', 'schedules', 'licenses', 'tickets', 'notifications',
  'disciplinas', 'horarios', 'materias', 'periodos', 'bimestres',
  'anotacoes', 'observacoes', 'registros', 'diarios',
  'escola_turmas', 'turma_alunos', 'turma_professores',
  'professor_disciplinas', 'professor_turmas', 'professor_escolas',
  'configuracoes', 'config', 'settings',
  'logs', 'audit_logs', 'historico',
  'matriculas', 'responsaveis', 'endereco', 'enderecos',
  'curriculos', 'habilidades', 'objetos_conhecimento',
  'recuperacao', 'resultados', 'medias',
  'calendario', 'feriados', 'eventos',
  'documentos', 'arquivos', 'uploads',
  'mensagens', 'comunicados', 'avisos',
  'presencas', 'faltas', 'justificativas'
];

console.log('=== DESCOBERTA DE TABELAS NO BANCO DC-DIGITAL ===\n');

const existingTables = [];

for (const table of possibleTables) {
  const { data, error, status } = await supabase.from(table).select('*').limit(0);
  
  if (status === 406 || (error && error.code === 'PGRST204')) {
    // Tabela não existe
  } else if (error && error.message?.includes('relation') && error.message?.includes('does not exist')) {
    // Tabela não existe
  } else if (status === 200 || status === 201 || !error) {
    existingTables.push(table);
    // Tentar pegar 1 row para ver colunas
    const { data: sample } = await supabase.from(table).select('*').limit(1);
    const cols = sample && sample.length > 0 ? Object.keys(sample[0]).join(', ') : '(vazia)';
    const count = sample?.length || 0;
    console.log(`✅ ${table.padEnd(28)} → ${count > 0 ? count + ' reg' : 'vazia'} | Colunas: ${cols}`);
  } else if (error && (error.code === '42501' || error.message?.includes('permission'))) {
    // Existe mas sem permissão (RLS bloqueou)
    existingTables.push(table);
    console.log(`🔒 ${table.padEnd(28)} → EXISTE (RLS bloqueou acesso anon)`);
  } else {
    // Outro erro - provavelmente não existe
  }
}

console.log(`\n=== TOTAL: ${existingTables.length} tabelas encontradas ===`);
console.log('Tabelas:', existingTables.join(', '));
