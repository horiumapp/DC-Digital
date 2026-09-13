import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowLeft, ShieldAlert, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import Background from '../components/Background';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';
import { translateSupabaseError } from '../utils/supabaseErrors';

const COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_SECONDS = 300; // 5 minutos
const ATTEMPTS_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

export default function RecuperarSenha() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Armazenamento de tentativas e bloqueios para proteção contra spam/abuso
  const [attempts, setAttempts] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('dc_pwd_reset_attempts');
      const timestamp = localStorage.getItem('dc_pwd_reset_time');
      if (stored && timestamp && Date.now() - parseInt(timestamp, 10) < ATTEMPTS_WINDOW_MS) {
        return parseInt(stored, 10);
      }
    } catch {
      // Falha silenciosa se localStorage não estiver disponível
    }
    return 0;
  });

  const [lockoutSeconds, setLockoutSeconds] = useState<number>(() => {
    try {
      const until = localStorage.getItem('dc_pwd_reset_lockout_until');
      if (until) {
        const remaining = Math.ceil((parseInt(until, 10) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch {
      // Ignorar erro
    }
    return 0;
  });

  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() => {
    try {
      const until = localStorage.getItem('dc_pwd_reset_cooldown_until');
      if (until) {
        const remaining = Math.ceil((parseInt(until, 10) - Date.now()) / 1000);
        return remaining > 0 ? remaining : 0;
      }
    } catch {
      // Ignorar erro
    }
    return 0;
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Efeito para decrementar os cronômetros de bloqueio/espera a cada segundo
  useEffect(() => {
    if (lockoutSeconds > 0 || cooldownSeconds > 0) {
      timerRef.current = setInterval(() => {
        setLockoutSeconds((prevLockout) => {
          if (prevLockout <= 1) return 0;
          return prevLockout - 1;
        });

        setCooldownSeconds((prevCooldown) => {
          if (prevCooldown <= 1) return 0;
          return prevCooldown - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lockoutSeconds, cooldownSeconds]);

  const registrarTentativa = useCallback(() => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    try {
      localStorage.setItem('dc_pwd_reset_attempts', nextAttempts.toString());
      localStorage.setItem('dc_pwd_reset_time', Date.now().toString());

      if (nextAttempts >= MAX_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_SECONDS * 1000;
        localStorage.setItem('dc_pwd_reset_lockout_until', lockoutUntil.toString());
        setLockoutSeconds(LOCKOUT_DURATION_SECONDS);
      } else {
        const cooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000;
        localStorage.setItem('dc_pwd_reset_cooldown_until', cooldownUntil.toString());
        setCooldownSeconds(COOLDOWN_SECONDS);
      }
    } catch {
      // Ignorar exceção de storage
    }
  }, [attempts]);

  const handleRecuperar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (lockoutSeconds > 0) {
      setError(`Muitas tentativas consecutivas. Aguarde ${Math.ceil(lockoutSeconds / 60)} minuto(s) antes de solicitar novamente.`);
      return;
    }

    if (cooldownSeconds > 0) {
      setError(`Aguarde ${cooldownSeconds} segundo(s) antes de enviar nova solicitação.`);
      return;
    }

    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido.');
      setIsLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (resetError) {
        // Tratar erro nativo de rate limit do Supabase
        const isRateLimit = resetError.status === 429 || 
          resetError.message.toLowerCase().includes('rate') || 
          resetError.message.toLowerCase().includes('over_email_send_rate_limit');

        if (isRateLimit) {
          registrarTentativa();
          setError('Limite de solicitações de e-mail atingido no momento. Por favor, aguarde alguns minutos antes de tentar novamente.');
          return;
        }

        throw resetError;
      }

      // Registro da tentativa e ativação de cooldown/lockout para segurança
      registrarTentativa();

      // Mensagem neutra anti-enumeração (não revela se o e-mail existe no banco)
      setSuccess('Se o e-mail informado estiver cadastrado no sistema, enviamos um link seguro de recuperação para a sua caixa de entrada. Por favor, verifique também a pasta de spam.');

    } catch (err: unknown) {
      registrarTentativa();
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(translateSupabaseError(errMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const isBlocked = lockoutSeconds > 0 || cooldownSeconds > 0;
  const activeWaitSeconds = lockoutSeconds > 0 ? lockoutSeconds : cooldownSeconds;

  return (
    <div className="dd-auth-shell min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 pointer-events-none" />

      <main className="relative w-full max-w-md z-10 dd-auth-content">
        <section className="dd-auth-card bg-white p-8 md:p-10 border rounded-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Logo Diário Digital" className="h-20 w-auto object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Recuperar Senha</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Preencha seu e-mail abaixo e enviaremos um link seguro para você cadastrar uma nova senha.
            </p>
          </div>

          {lockoutSeconds > 0 && (
            <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-lg text-sm font-medium border border-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Proteção contra tentativas repetidas</strong>
                Aguarde {Math.ceil(lockoutSeconds / 60)} minuto(s) ({lockoutSeconds}s) antes de realizar uma nova tentativa de recuperação.
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100 text-center space-y-3">
              <p>{success}</p>
              {cooldownSeconds > 0 && (
                <div className="text-xs text-emerald-600 flex items-center justify-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Próximo reenvio disponível em {cooldownSeconds}s
                </div>
              )}
            </div>
          )}

          {error && !lockoutSeconds && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleRecuperar} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-base font-medium text-slate-700">E-mail</label>
                <input 
                  type="email" 
                  id="email" 
                  name="email" 
                  placeholder="seu@email.com" 
                  required 
                  autoComplete="email"
                  disabled={isLoading || isBlocked}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isLoading || isBlocked}
                  className="w-full flex justify-center items-center bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white text-base font-bold py-4 px-4 rounded-xl shadow-lg shadow-[#0f2851]/20 transition-all active:scale-95 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
                  ) : isBlocked ? (
                    <><Clock className="w-5 h-5 mr-2" /> Aguarde {activeWaitSeconds}s</>
                  ) : (
                    'Enviar Link de Recuperação'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link to="/" className="text-[#0f2851] font-bold hover:underline flex items-center justify-center gap-1 transition-all">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Login
            </Link>
          </div>
        </section>

        <footer className="mt-6 text-center text-slate-400 text-xs">
          © {APP_CONFIG.YEAR} Diário Digital. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}

