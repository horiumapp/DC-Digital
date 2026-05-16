import React, { useState, useRef, useCallback } from 'react';
import { Loader2, GraduationCap, Briefcase } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Background from '../components/Background';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import { supabase } from '../lib/supabase';
import { translateSupabaseError } from '../utils/supabaseErrors';

const ALUNO_EMAIL_DOMAIN = 'aluno.dcdigital.local';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage;
  const { user } = useAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'servidor' | 'aluno'>('servidor');

  // Rate limiting client-side: bloquear após 5 tentativas falhas em 60 segundos
  const failedAttempts = useRef(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockout = useCallback(() => {
    const LOCKOUT_DURATION = 60;
    setLockoutSeconds(LOCKOUT_DURATION);
    lockoutTimer.current = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(lockoutTimer.current!);
          lockoutTimer.current = null;
          failedAttempts.current = 0;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleRealLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Bloquear se em lockout
    if (lockoutSeconds > 0) return;

    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    let email: string;
    const password = formData.get('password') as string;

    if (loginMode === 'aluno') {
      const matricula = (formData.get('matricula') as string).trim().replace(/\D/g, '');
      if (!matricula || matricula.length !== 11) {
        setError('Informe o CPF completo (11 dígitos).');
        setIsLoading(false);
        return;
      }
      email = `${matricula}@${ALUNO_EMAIL_DOMAIN}`;
    } else {
      email = formData.get('email') as string;
    }

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      // Redirecionar baseado no tipo de login
      navigate(loginMode === 'aluno' ? '/portal-aluno' : '/turmas');

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      failedAttempts.current += 1;
      if (failedAttempts.current >= 5 && !lockoutTimer.current) {
        startLockout();
        setError('Muitas tentativas falhas. Aguarde 60 segundos antes de tentar novamente.');
      } else if (loginMode === 'aluno' && errMsg.includes('Invalid login')) {
        setError('Matrícula ou senha incorreta. Verifique seus dados.');
      } else {
        setError(translateSupabaseError(errMsg));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 pointer-events-none" />

      <main className="relative w-full max-w-md z-10">
        <section className="bg-white p-8 md:p-10 shadow-xl border border-slate-100 rounded-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Logo Diário Digital" className="h-20 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Diário Digital</h1>
            <p className="text-slate-500 mt-2 text-sm">Entre com suas credenciais de acesso</p>
          </div>

          {/* Toggle Servidor / Aluno */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMode('servidor'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                loginMode === 'servidor'
                  ? 'bg-white text-[#0f2851] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Servidor
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('aluno'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                loginMode === 'aluno'
                  ? 'bg-white text-[#0f2851] shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Aluno
            </button>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-medium border border-emerald-100 text-center">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleRealLogin} className="space-y-6">
            {loginMode === 'servidor' ? (
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 uppercase tracking-wide">E-mail</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="seu@email.com" 
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor="matricula" className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Matrícula do Aluno</label>
                <input 
                  type="text" 
                  id="matricula" 
                  name="matricula" 
                  placeholder="000.000.000-00" 
                  maxLength={14}
                  required 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30"
                />
                <p className="text-[10px] text-slate-400 font-medium">Digite os 11 dígitos da Matrícula para acessar.</p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Senha</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                required 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30"
              />
            </div>

            {loginMode === 'servidor' && (
              <div className="flex items-center justify-end">
                <div className="text-sm">
                  <Link to="/recuperar-senha" className="font-bold text-[#0f2851] hover:underline transition-all">
                    Esqueceu a senha?
                  </Link>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLoading || lockoutSeconds > 0}
                className="w-full flex justify-center items-center bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white text-base font-bold py-4 px-4 rounded-xl shadow-lg shadow-[#0f2851]/20 transition-all active:scale-95"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Entrando...</>
                ) : lockoutSeconds > 0 ? (
                  `Aguarde ${lockoutSeconds}s...`
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>


        </section>

        <footer className="mt-6 text-center text-slate-400 text-xs">
          © {APP_CONFIG.YEAR} Diário Digital. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
