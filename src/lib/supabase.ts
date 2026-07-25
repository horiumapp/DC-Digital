import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('As variáveis de ambiente do Supabase estão ausentes. Verifique seu arquivo .env');
}

// FIX SEC: Configuração explícita de autenticação para maior segurança
// SEGURANÇA: sessionStorage em vez de localStorage para o JWT.
// localStorage persiste indefinidamente e é acessível por qualquer script da mesma
// origem — um XSS bem-sucedido poderia roubar o refresh token e sequestrar a sessão.
// sessionStorage expira ao fechar a aba/browser, limitando a janela de exposição.
// TRADE-OFF: Usuário precisa fazer login novamente ao abrir o browser.
// Aceitável para um sistema escolar com dados sensíveis de menores (LGPD).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // PKCE é mais seguro que implicit para SPAs
    storage: {
      // Substituir localStorage (padrão) por sessionStorage
      getItem: (key: string) => sessionStorage.getItem(key),
      setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
      removeItem: (key: string) => sessionStorage.removeItem(key),
    },
  },
});
