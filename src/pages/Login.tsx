import React from 'react';
import { BookOpen } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Background from '../components/Background';
import { useAuth, UserRole } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent, role: UserRole) => {
    e.preventDefault();
    login(role);
    navigate('/turmas');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Educational-themed watermark background */}
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 pointer-events-none" />

      <main className="relative w-full max-w-md z-10">
        <section className="bg-white p-8 md:p-10 shadow-xl border border-slate-100 rounded-xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-xl mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Diário de Classe Digital</h1>
            <p className="text-slate-500 mt-2 text-sm">Entre com suas credenciais para acessar sua conta</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-base font-medium text-slate-700">E-mail</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                defaultValue="admin@escola.com"
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
                defaultValue="12345678"
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

            <div className="pt-4 flex flex-col gap-3">
              <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Simulação de Perfil de Acesso</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={(e) => handleLogin(e, 'ADMIN')}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all"
                >
                  Logar como ADMIN
                </button>
                <button 
                  onClick={(e) => handleLogin(e, 'GESTOR')}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all"
                >
                  Logar como GESTOR
                </button>
                <button 
                  onClick={(e) => handleLogin(e, 'SECRETARIO')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all"
                >
                  Logar como SECRETÁRIO
                </button>
                <button 
                  onClick={(e) => handleLogin(e, 'PROFESSOR')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-sm transition-all"
                >
                  Logar como PROFESSOR
                </button>
              </div>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              Não possui uma conta?{' '}
              <a href="#" className="text-blue-600 font-medium hover:underline">Solicite acesso</a>
            </p>
            <p className="mt-4 text-[10px] text-slate-400 uppercase tracking-widest">
              Protegido por Supabase Auth
            </p>
          </div>
        </section>

        <footer className="mt-8 text-center text-slate-400 text-xs">
          © 2026 Diário de Classe Digital. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
