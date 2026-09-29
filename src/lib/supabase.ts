import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('As variáveis de ambiente do Supabase estão ausentes. Verifique seu arquivo .env');
}

// Configuração de autenticação do Supabase
// Usamos localStorage (padrão) para garantir que o verificador PKCE e a sessão
// estejam disponíveis quando o usuário clica em links de e-mail (que abrem em nova aba).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: localStorage,
  },
});
