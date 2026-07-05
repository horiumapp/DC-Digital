import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, GraduationCap, Briefcase } from 'lucide-react';
import { useCaptcha } from '../hooks/useCaptcha';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Background from '../components/Background';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import { supabase } from '../lib/supabase';
import { translateSupabaseError } from '../utils/supabaseErrors';
import PrivacyLinksFooter from '../components/PrivacyLinksFooter';
import { logSecurityEvent } from '../services/securityLogService';
import { validarCPF } from '../utils/cpfUtils';

const ALUNO_EMAIL_DOMAIN = 'aluno.dcdigital.local';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage;
  const { user } = useAuth();

  // Redireciona automaticamente se o usuário já estiver logado
  useEffect(() => {
    if (user) {
      navigate(user.role === 'ALUNO' ? '/portal-aluno' : '/turmas', { replace: true });
    }
  }, [user, navigate]);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'servidor' | 'aluno'>('servidor');

  // Rate limiting client-side: bloquear após 5 tentativas falhas em 60 segundos (persistido no sessionStorage)
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const stored = sessionStorage.getItem('failed_attempts');
    return stored ? parseInt(stored, 10) : 0;
  });
  
  const [lockoutSeconds, setLockoutSeconds] = useState(() => {
    const until = sessionStorage.getItem('lockout_until');
    if (until) {
      const remaining = Math.ceil((parseInt(until, 10) - Date.now()) / 1000);
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const captcha = useCaptcha();
  const showCaptcha = failedAttempts >= 3;

  const startLockout = useCallback((duration = 60) => {
    const until = Date.now() + duration * 1000;
    sessionStorage.setItem('lockout_until', until.toString());
    setLockoutSeconds(duration);
  }, []);

  useEffect(() => {
    if (lockoutSeconds > 0) {
      lockoutTimer.current = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev <= 1) {
            clearInterval(lockoutTimer.current!);
            lockoutTimer.current = null;
            sessionStorage.removeItem('lockout_until');
            setFailedAttempts(0);
            sessionStorage.setItem('failed_attempts', '0');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (lockoutTimer.current) clearInterval(lockoutTimer.current);
    };
  }, [lockoutSeconds]);

  const handleRealLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Bloquear se em lockout
    if (lockoutSeconds > 0) return;

    if (showCaptcha) {
      if (!captcha.validateCaptcha()) {
        setError('Código de verificação (Captcha) incorreto.');
        captcha.generateNewCaptcha();
        return;
      }
    }

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
      // FIX #8: Validar CPF matematicamente antes de enviar ao servidor
      if (!validarCPF(matricula)) {
        setError('CPF inválido. Verifique os dígitos informados.');
        setIsLoading(false);
        return;
      }
      email = `${matricula}@${ALUNO_EMAIL_DOMAIN}`;
    } else {
      email = formData.get('email') as string;
    }

    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      if (signInData?.user) {
        await logSecurityEvent({
          userId: signInData.user.id,
          userEmail: email,
          action: 'LOGIN',
          metadata: { tipo_login: loginMode },
        });
      }

      // Se login bem sucedido, limpa tentativas falhas
      setFailedAttempts(0);
      sessionStorage.setItem('failed_attempts', '0');
      sessionStorage.removeItem('lockout_until');

      // Redirecionar baseado na role real do usuário, ou fallback para o loginMode
      const role = signInData?.user?.app_metadata?.role;
      if (role === 'ALUNO') {
        navigate('/portal-aluno');
      } else if (role) {
        navigate('/turmas');
      } else {
        navigate(loginMode === 'aluno' ? '/portal-aluno' : '/turmas');
      }

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      
      await logSecurityEvent({
        userEmail: email,
        action: 'LOGIN_FAILED',
        metadata: { tipo_login: loginMode, erro: errMsg },
      });

      const nextAttempts = failedAttempts + 1;
      setFailedAttempts(nextAttempts);
      sessionStorage.setItem('failed_attempts', nextAttempts.toString());

      if (nextAttempts >= 5) {
        startLockout(60);
        setError('Muitas tentativas falhas. Aguarde 60 segundos antes de tentar novamente.');
      } else {
        if (nextAttempts >= 3) {
          captcha.generateNewCaptcha();
        }
        if (loginMode === 'aluno' && errMsg.includes('Invalid login')) {
          setError('Matrícula ou senha incorreta. Verifique seus dados.');
        } else {
          setError(translateSupabaseError(errMsg));
        }
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
                  autoComplete="username"
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
                  autoComplete="username"
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
                minLength={6}
                autoComplete="current-password"
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

            {showCaptcha && (
              <div className="space-y-2 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">
                  Código de Verificação
                </label>
                <div className="flex gap-3 items-center">
                  <div 
                    onClick={captcha.generateNewCaptcha}
                    className="cursor-pointer select-none bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-mono font-bold tracking-widest text-lg border border-slate-300 shadow-inner hover:bg-slate-300 transition-all flex items-center justify-center min-w-[80px]"
                    title="Clique para gerar outro código"
                  >
                    {captcha.generatedCaptcha}
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Digite o código"
                    value={captcha.captchaInput}
                    onChange={(e) => captcha.setCaptchaInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Clique no código cinza se precisar recarregá-lo.
                </p>
                {captcha.captchaError && (
                  <p className="text-xs text-red-600 font-bold mt-1">Código incorreto. Tente novamente.</p>
                )}
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
        <PrivacyLinksFooter className="mt-6" />
      </main>
    </div>
  );
}
