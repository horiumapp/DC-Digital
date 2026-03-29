import React, { useState } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Background from '../components/Background';
import { useAuth, UserRole } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.successMessage;
  const { login } = useAuth();
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Manipulador do form REAL conectado ao Supabase
  const handleRealLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      // Deu certo, o onAuthStateChange global vai carregar o user automaticamente
      // Só empurramos pra tela seguinte
      navigate('/turmas');

    } catch (err: any) {
      if (err.message.includes("Invalid login credentials")) {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Erro ao efetuar login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mantido só para facilitar seus testes como dev:
  const handleSimulatedLogin = (e: React.MouseEvent, role: UserRole) => {
    e.preventDefault();
    login(role); // Entra estaticamente num state sem bater no servidor
    navigate('/turmas');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Modelo Educacional de Fundo */}
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 pointer-events-none" />

      <main className="relative w-full max-w-md z-10">
        <section className="bg-white p-8 md:p-10 shadow-xl border border-slate-100 rounded-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-xl mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Diário de Classe Digital</h1>
            <p className="text-slate-500 mt-2 text-sm">Entre com suas credenciais de acesso</p>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100 text-center">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100 text-center">
              {error}
            </div>
          )}

          {/* FORMULÁRIO DE LOGIN ORIGINAL */}
          <form onSubmit={handleRealLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-base font-medium text-slate-700">E-mail</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                placeholder="seu@email.com" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors outline-none text-base" 
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-base font-medium text-slate-700">Senha</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="••••••••" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors outline-none text-base" 
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input 
                  type="checkbox" 
                  id="remember_me" 
                  name="remember_me" 
                  className="h-5 w-5 text-blue-600 focus:ring-blue-600 border-slate-300 rounded" 
                />
                <label htmlFor="remember_me" className="ml-2 block text-base text-slate-600 select-none">
                  Lembrar-me
                </label>
              </div>
              <div className="text-base">
                <a href="#" className="font-medium text-blue-600 hover:underline transition-all">
                  Esqueceu a senha?
                </a>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-base font-semibold py-3 px-4 rounded-lg shadow-sm transition-all"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Entrando...</>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>

          {/* ÁREA DE TESTE DO DESENVOLVEDOR (MOCKS) */}
          <div className="pt-8 mt-8 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-center mb-2 justify-center">
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase">
                Acesso Rápido para Testes
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={(e) => handleSimulatedLogin(e, 'ADMIN')}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold py-2 px-3 rounded-md shadow-sm opacity-80 hover:opacity-100 transition-all"
              >
                Como ADMIN
              </button>
              <button 
                type="button"
                onClick={(e) => handleSimulatedLogin(e, 'GESTOR')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold py-2 px-3 rounded-md shadow-sm opacity-80 hover:opacity-100 transition-all"
              >
                Como GESTOR
              </button>
              <button 
                type="button"
                onClick={(e) => handleSimulatedLogin(e, 'SECRETARIO')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold py-2 px-3 rounded-md shadow-sm opacity-80 hover:opacity-100 transition-all"
              >
                Como SECRETÁRIO
              </button>
              <button 
                type="button"
                onClick={(e) => handleSimulatedLogin(e, 'PROFESSOR')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold py-2 px-3 rounded-md shadow-sm opacity-80 hover:opacity-100 transition-all"
              >
                Como PROFESSOR
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Não possui uma conta?{' '}
              <Link to="/cadastro" className="text-blue-600 font-medium hover:underline">Criar conta</Link>
            </p>
            <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest">
              Protegido por Supabase Auth
            </p>
          </div>
        </section>

        <footer className="mt-6 text-center text-slate-400 text-xs">
          © 2026 Diário de Classe Digital. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
