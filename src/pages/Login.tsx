import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Loader2, GraduationCap, Briefcase, Sparkles, ShieldCheck, WifiOff, CheckCircle2 } from 'lucide-react';
import { useCaptcha } from '../hooks/useCaptcha';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Background from '../components/Background';
import { useAuth } from '../contexts/AuthContext';
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

  // UX LOCAL de tentativas e lockout timer
  const [failedAttempts, setFailedAttempts] = useState(() => {
    const stored = localStorage.getItem('dc_failed_attempts');
    return stored ? parseInt(stored, 10) : 0;
  });
  
  const [lockoutSeconds, setLockoutSeconds] = useState(() => {
    const until = localStorage.getItem('dc_lockout_until');
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
    localStorage.setItem('dc_lockout_until', until.toString());
    setLockoutSeconds(duration);
  }, []);

  useEffect(() => {
    if (lockoutSeconds > 0) {
      lockoutTimer.current = setInterval(() => {
        setLockoutSeconds(prev => {
          if (prev <= 1) {
            clearInterval(lockoutTimer.current!);
            lockoutTimer.current = null;
            localStorage.removeItem('dc_lockout_until');
            setFailedAttempts(0);
            localStorage.setItem('dc_failed_attempts', '0');
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

      setFailedAttempts(0);
      localStorage.setItem('dc_failed_attempts', '0');
      localStorage.removeItem('dc_lockout_until');

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
      localStorage.setItem('dc_failed_attempts', nextAttempts.toString());

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
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden bg-slate-50 dark:bg-[#070c14]">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50/90 via-slate-100/60 to-[#0b1f3f]/5 dark:from-[#070c14]/95 dark:via-[#0b1f3f]/20 dark:to-black/80 pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-5xl z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Editorial Narrative Panel (Desktop) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between space-y-8 pr-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-sky-950/60 text-[#0b1f3f] dark:text-sky-300 text-xs font-bold uppercase tracking-wider mb-6 border border-blue-200/60 dark:border-sky-800/60">
              <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-sky-400" />
              Gestão Pedagógica Digital
            </div>
            
            <h1 className="text-4xl font-extrabold text-[#0b1f3f] dark:text-white tracking-tight leading-tight">
              O espaço de trabalho moderno do educador.
            </h1>
            
            <p className="text-base text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
              Desenvolvido para agilizar o diário de classe, registrar frequências e acompanhar o progresso pedagógico sem fricção ou perda de tempo.
            </p>
          </div>

          {/* Pillars List */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Frequência e Conteúdo em Segundos</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Lançamento de aulas com um toque e visão contínua dos bimestres.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-sky-400 flex-shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Operação Offline Confiável</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Trabalhe em sala sem internet. Seus dados sincronizam com segurança ao reconectar.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 flex-shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Segurança & Privacidade</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Criptografia em repouso e total conformidade com a LGPD escolar.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 font-medium">
            DC Digital • Sistema de Gestão Escolar Integrada
          </div>
        </div>

        {/* Right Authentication Card */}
        <div className="w-full lg:col-span-6 flex flex-col items-center">
          <main className="w-full max-w-md">
            <section className="bg-white dark:bg-slate-900 p-7 sm:p-9 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xl shadow-[#0b1f3f]/5">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <img src="/logo.png" alt="Logo DC Digital" className="h-16 w-auto object-contain" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#0b1f3f] dark:text-white tracking-tight">
                  DC Digital
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 text-xs sm:text-sm font-medium">
                  Acesse seu diário de classe e portal acadêmico
                </p>
              </div>

              {/* Mode Toggle: Servidor / Aluno */}
              <div className="flex bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1 mb-6 border border-slate-200/60 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => { setLoginMode('servidor'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    loginMode === 'servidor'
                      ? 'bg-[#0b1f3f] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Educador / Servidor
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode('aluno'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    loginMode === 'aluno'
                      ? 'bg-[#0b1f3f] text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  Estudante
                </button>
              </div>

              {successMessage && (
                <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs sm:text-sm font-semibold border border-emerald-200 dark:border-emerald-800 text-center">
                  {successMessage}
                </div>
              )}

              {error && (
                <div className="mb-5 p-3.5 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 rounded-xl text-xs sm:text-sm font-semibold border border-rose-200 dark:border-rose-800 text-center">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleRealLogin} className="space-y-4">
                {loginMode === 'servidor' ? (
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      E-mail Institucional
                    </label>
                    <input 
                      type="email" 
                      id="email" 
                      name="email" 
                      placeholder="professor@escola.gov.br" 
                      required 
                      autoComplete="username"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0b1f3f]/15 focus:border-[#0b1f3f] transition-all shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label htmlFor="matricula" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      CPF do Aluno
                    </label>
                    <input 
                      type="text" 
                      id="matricula" 
                      name="matricula" 
                      placeholder="000.000.000-00" 
                      maxLength={14}
                      required 
                      autoComplete="username"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0b1f3f]/15 focus:border-[#0b1f3f] transition-all shadow-sm"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Digite os 11 dígitos do CPF para acessar.</p>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Senha de Acesso
                    </label>
                    {loginMode === 'servidor' && (
                      <Link 
                        to="/recuperar-senha" 
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-sky-400 hover:underline transition-all"
                      >
                        Esqueceu?
                      </Link>
                    )}
                  </div>
                  <input 
                    type="password" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    required 
                    minLength={8}
                    autoComplete="current-password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#0b1f3f]/15 focus:border-[#0b1f3f] transition-all shadow-sm"
                  />
                </div>

                {/* Captcha se tentativas falhas >= 3 */}
                {showCaptcha && (
                  <div className="space-y-2 border border-slate-200 dark:border-slate-700 p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Código de Verificação
                    </label>
                    <div className="flex gap-3 items-center">
                      <div 
                        onClick={captcha.generateNewCaptcha}
                        className="cursor-pointer select-none bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-lg font-mono font-bold tracking-widest text-lg border border-slate-300 dark:border-slate-600 shadow-inner hover:bg-slate-300 transition-all flex items-center justify-center min-w-[80px]"
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
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b1f3f]/15 focus:border-[#0b1f3f] transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      Clique no código se precisar recarregá-lo.
                    </p>
                    {captcha.captchaError && (
                      <p className="text-xs text-rose-600 dark:text-rose-400 font-bold mt-1">Código incorreto. Tente novamente.</p>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0}
                    className="w-full flex justify-center items-center bg-[#0b1f3f] hover:bg-[#133060] disabled:bg-slate-400 text-white text-sm font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#0b1f3f]/15 transition-all active:scale-98 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando no sistema...</>
                    ) : lockoutSeconds > 0 ? (
                      `Aguarde ${lockoutSeconds}s para nova tentativa`
                    ) : (
                      'Entrar no Sistema'
                    )}
                  </button>
                </div>
              </form>
            </section>

            <PrivacyLinksFooter className="mt-5" />
          </main>
        </div>
      </div>
    </div>
  );
}
