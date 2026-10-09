import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { translateSupabaseError } from '../utils/supabaseErrors';

function validarSenha(senha: string, aluno: boolean): string | null {
  const minimo = aluno ? 10 : 8;
  if (senha.length < minimo) return `A senha deve ter no mínimo ${minimo} caracteres.`;
  if (!/[A-Za-z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'A senha deve incluir letras e números.';
  }
  return null;
}

export default function TrocaSenhaObrigatoria() {
  const { user, logout, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get('password') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    const forca = validarSenha(password, user?.role === 'ALUNO');
    if (forca) {
      setError(forca);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-create-user', {
        body: { action: 'change-own-password', senha: password },
      });
      if (invokeError || data?.error) {
        throw new Error(data?.error || invokeError?.message || 'Não foi possível alterar a senha.');
      }
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) throw refreshError;
      await refreshUser();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(translateSupabaseError(message));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Defina sua senha</h1>
        <p className="text-sm text-slate-500">
          A senha temporária precisa ser trocada antes de entrar no diário.
        </p>
        <label className="block text-sm font-medium text-slate-700" htmlFor="password">Nova senha</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        <label className="block text-sm font-medium text-slate-700" htmlFor="confirmPassword">Confirmar senha</label>
        <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required className="w-full border border-slate-300 rounded-lg px-3 py-2" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#0f2851] text-white font-bold rounded-xl disabled:opacity-60">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar senha'}
        </button>
        <button type="button" onClick={() => logout()} className="w-full py-2 text-sm text-slate-500">
          Sair
        </button>
      </form>
    </div>
  );
}
