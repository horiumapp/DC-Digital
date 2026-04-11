import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://iaeisumzwxhwioufgliu.supabase.co',
  '***REMOVED_ANON_KEY***'
);

// Buscar todas as policies via pg_policies (sem acesso service_role, tentamos via RPC)
// Na verdade, vamos tentar uma abordagem pelo cliente
// O problema é que temos policies OLD que usam role 'public' ou 'anon'

console.log('Tentando buscar políticas via information_schema...');
const { data, error } = await supabase.rpc('get_policies_info').select('*');
if (error) {
  console.log('RPC não disponível. Veja as políticas diretamente no Supabase Dashboard.');
  console.log('Acesse: https://supabase.com/dashboard/project/iaeisumzwxhwioufgliu/auth/policies');
  console.log('\nAs tabelas vulneráveis provavelmente têm policies existentes para o role "public" ou "anon".');
  console.log('\nTabelas que AINDA estão vulneráveis a UPDATE/DELETE anônimo:');
  console.log('- alunos, turmas, escolas, professores');
  console.log('- professor_horarios, professor_alocacoes, usuarios');
  console.log('\nTabelas corretamente protegidas:');
  console.log('- frequencias, conteudos, avaliacoes, notas');
}
