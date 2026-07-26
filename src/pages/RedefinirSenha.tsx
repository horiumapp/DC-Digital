import React, { useState, useEffect } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Background from '../components/Background';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';
import { translateSupabaseError } from '../utils/supabaseErrors';

/** SEC-05 FIX: mesma validação de força usada no Cadastro */
function validarForcaSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (!/[A-Z]/.test(senha)) return 'A senha deve conter pelo menos uma letra maiúscula.';
  if (!/[0-9]/.test(senha)) return 'A senha deve conter pelo menos um número.';
  return null;
}

export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifySessionAndCode = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');

        if (code) {
          // Trata troca do código PKCE recebido via parâmetro URL
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('[RedefinirSenha] Erro ao trocar código:', exchangeError);
            if (isMounted) {
              setError('O link de redefinição de senha é inválido ou expirou. Solicite um novo link de recuperação.');
              setIsSessionValid(false);
            }
            return;
          }
        }

        // Verifica se a sessão atual existe e é válida
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          if (session) {
            setIsSessionValid(true);
          } else {
            setError('O link de redefinição de senha é inválido ou expirou. Solicite um novo link de recuperação.');
            setIsSessionValid(false);
          }
        }
      } catch (err) {
        console.error('[RedefinirSenha] Erro na verificação da sessão:', err);
        if (isMounted) {
          setError('Ocorreu um erro ao validar seu link de recuperação. Tente novamente.');
          setIsSessionValid(false);
        }
      } finally {
        if (isMounted) {
          setIsVerifyingSession(false);
        }
      }
    };

    verifySessionAndCode();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        if (isMounted) {
          setIsSessionValid(true);
          setError(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleRedefinir = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Tente novamente.');
      setIsLoading(false);
      return;
    }

    // SEC-05 FIX: validar força da nova senha antes de atualizar
    const forcaError = validarForcaSenha(password);
    if (forcaError) {
      setError(forcaError);
      setIsLoading(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Auth session missing');
      }

      const { error: resetError } = await supabase.auth.updateUser({ password });

      if (resetError) throw resetError;

      // Sai e manda pro login
      await supabase.auth.signOut();
      
      // Passa uma mensagem de sucesso para a página de Login via state
      navigate('/', { state: { successMessage: 'Senha atualizada com sucesso! Faça login com a nova senha.' } });

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(translateSupabaseError(errMsg));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 pointer-events-none" />

      <main className="relative w-full max-w-md z-10">
        <section className="bg-white p-8 md:p-10 shadow-xl border border-slate-100 rounded-xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Logo Diário Digital" className="h-20 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Criar Nova Senha</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Sua redefinição foi validada. Escolha uma nova senha para sua conta.
            </p>
          </div>

          {isVerifyingSession ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-600">
              <Loader2 className="w-8 h-8 animate-spin text-[#0f2851]" />
              <p className="text-sm font-medium">Validando link de recuperação...</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100 text-center">
                  {error}
                </div>
              )}

              {!isSessionValid ? (
                <div className="space-y-4 text-center">
                  <p className="text-slate-600 text-sm">
                    Para sua segurança, solicite um novo e-mail de recuperação de senha.
                  </p>
                  <Link
                    to="/recuperar-senha"
                    className="w-full inline-flex justify-center items-center bg-[#0f2851] hover:bg-[#1a3a6d] text-white text-base font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
                  >
                    Solicitar Novo Link
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleRedefinir} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-base font-medium text-slate-700">Nova Senha</label>
                    <input 
                      type="password" 
                      id="password" 
                      name="password" 
                      placeholder="••••••••" 
                      required 
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-base font-medium text-slate-700">Confirmar Nova Senha</label>
                    <input 
                      type="password" 
                      id="confirmPassword" 
                      name="confirmPassword" 
                      placeholder="••••••••" 
                      required 
                      minLength={8}
                      autoComplete="new-password"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30"
                    />
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex justify-center items-center bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white text-base font-bold py-4 px-4 rounded-xl shadow-lg shadow-[#0f2851]/20 transition-all active:scale-95"
                    >
                      {isLoading ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Atualizando...</>
                      ) : (
                        'Salvar Nova Senha'
                      )}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                <Link to="/" className="text-[#0f2851] font-bold hover:underline flex items-center justify-center gap-1 transition-all text-sm">
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Login
                </Link>
              </div>
            </>
          )}
        </section>

        <footer className="mt-6 text-center text-slate-400 text-xs">
          © {APP_CONFIG.YEAR} Diário Digital. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
