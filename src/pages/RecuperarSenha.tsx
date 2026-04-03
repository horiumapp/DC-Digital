import React, { useState } from 'react';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import Background from '../components/Background';
import { supabase } from '../lib/supabase';
import { translateSupabaseError } from '../utils/supabaseErrors';

export default function RecuperarSenha() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRecuperar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (resetError) throw resetError;

      setSuccess('Enviamos um link de redefinição para o seu e-mail. Por favor, verifique a sua caixa de entrada e a pasta de spam.');

    } catch (err: any) {
      setError(translateSupabaseError(err.message));
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
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Recuperar Senha</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Preencha seu e-mail abaixo e enviaremos um link seguro para você cadastrar uma nova senha.
            </p>
          </div>

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium border border-emerald-100 text-center">
              {success}
            </div>
          )}

          {error && (
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
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors outline-none text-base" 
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-base font-semibold py-3 px-4 rounded-lg shadow-sm transition-all"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
                  ) : (
                    'Enviar Link de Recuperação'
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <Link to="/" className="text-blue-600 font-medium hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Login
            </Link>
          </div>
        </section>

        <footer className="mt-6 text-center text-slate-400 text-xs">
          © 2026 Diário Digital. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
