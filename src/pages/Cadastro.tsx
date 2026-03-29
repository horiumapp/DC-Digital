import React, { useState } from 'react';
import { BookOpen, UserPlus, ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Background from '../components/Background';
import { supabase } from '../lib/supabase';
import { UserRole } from '../contexts/AuthContext';

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    let role = formData.get('role') as UserRole;

    // Regra de segurança: O Administrador é apenas o dono do sistema
    const adminEmails = ['pro.jackison@gmail.com', 'jackison1985@hotmail.com'];
    if (adminEmails.includes(email.toLowerCase())) {
      role = 'ADMIN';
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      // Se deu tudo certo, redireciona para a tela de Login com a mensagem
      navigate('/', { 
        state: { 
          successMessage: 'Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar o cadastro antes de fazer o login.' 
        } 
      });

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      <Background />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 to-slate-50/40 pointer-events-none" />

      <main className="relative w-full max-w-md z-10">
        <section className="bg-white p-8 md:p-10 shadow-xl border border-slate-100 rounded-xl">
          
          <div className="mb-6">
            <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar para o Login
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-xl mb-4">
              <UserPlus className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Criar Conta</h1>
            <p className="text-slate-500 mt-2 text-sm">Preencha os dados abaixo para se cadastrar</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">Nome Completo</label>
              <input 
                type="text" 
                id="name" 
                name="name" 
                placeholder="Ex: João da Silva" 
                required 
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors outline-none text-base" 
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
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
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Senha</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                placeholder="Mínimo 6 caracteres" 
                minLength={6}
                required 
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors outline-none text-base" 
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">Perfil de Acesso</label>
              <select
                id="role"
                name="role"
                required
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors outline-none text-base bg-white"
              >
                <option value="PROFESSOR">Professor</option>
                <option value="GESTOR">Gestor</option>
                <option value="SECRETARIO">Secretário</option>
              </select>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-base font-semibold py-3 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Cadastrar'
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="mt-2 text-[10px] text-slate-400 uppercase tracking-widest">
              Protegido por Supabase Auth
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
