import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Background from '../components/Background';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../contexts/AuthContext';
import { translateSupabaseError } from '../utils/supabaseErrors';
import { validarCPF, formatarCPF } from '../utils/cpfUtils';

/** Avalia a força da senha: mínimo 8 chars, 1 maiúscula, 1 número */
function validarForcaSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
  if (!/[A-Z]/.test(senha)) return 'A senha deve conter pelo menos uma letra maiúscula.';
  if (!/[0-9]/.test(senha)) return 'A senha deve conter pelo menos um número.';
  return null;
}

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cpfValue, setCpfValue] = useState('');
  const [cpfError, setCpfError] = useState<string | null>(null);
  const [senhaConfirm, setSenhaConfirm] = useState('');
  const [senhaPrincipal, setSenhaPrincipal] = useState('');
  const [senhaError, setSenhaError] = useState<string | null>(null);

  
  // Formata e valida o CPF em tempo real
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatarCPF(e.target.value);
    setCpfValue(formatted);
    if (formatted.replace(/\D/g, '').length === 11) {
      setCpfError(validarCPF(formatted) ? null : 'CPF inválido. Verifique os dígitos.');
    } else {
      setCpfError(null);
    }
  };

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    e.target.value = value;
  };

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = (formData.get('email') as string).trim();
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const role: UserRole = 'PROFESSOR'; // Segurança: role fixo. Promoção via painel admin.
    
    // Pegando dados adicionais do docente
    const cpf = cpfValue || null;
    const telefone = formData.get('telefone') as string | null;
    const vinculo = formData.get('vinculo') as string | null;

    // Validar CPF antes de enviar
    if (cpf && !validarCPF(cpf)) {
      setError('CPF inválido. Verifique os dígitos e tente novamente.');
      setLoading(false);
      return;
    }

    // Validar força da senha
    const forcaError = validarForcaSenha(password);
    if (forcaError) {
      setError(forcaError);
      setLoading(false);
      return;
    }

    // Validar confirmação de senha antes de enviar
    if (password !== senhaConfirm) {
      setError('As senhas não coincidem. Verifique e tente novamente.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            // SEGURANÇA: role NÃO é definido via user_metadata (controlado por app_metadata no servidor)
            // O trigger handle_new_user define o cargo padrão como PROFESSOR automaticamente
            full_name: name,
            ...(cpf && { cpf }),
            ...(telefone && { telefone }),
            ...(vinculo && { vinculo }),
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
      setError(translateSupabaseError(err.message));
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
            <Link to="/" className="inline-flex items-center text-sm font-bold text-[#0f2851] hover:underline transition-all">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar para o Login
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <img src="/logo.png" alt="Logo Diário Digital" className="h-16 w-auto object-contain" />
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30"
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
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">Senha</label>
              <input 
                type="password" 
                id="password" 
                name="password"
                value={senhaPrincipal}
                onChange={(e) => {
                  setSenhaPrincipal(e.target.value);
                  setSenhaError(validarForcaSenha(e.target.value));
                }}
                placeholder="Mín. 8 chars, 1 maiúscula, 1 número" 
                minLength={8}
                required 
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30 ${
                  senhaError ? 'border-amber-400' : 'border-slate-200'
                }`}
              />
              {senhaError && (
                <p className="text-xs text-amber-600 font-medium mt-1">{senhaError}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password_confirm" className="block text-sm font-medium text-slate-700">Confirmar Senha</label>
              <input 
                type="password" 
                id="password_confirm" 
                name="password_confirm"
                value={senhaConfirm}
                onChange={(e) => setSenhaConfirm(e.target.value)}
                placeholder="Repita a senha" 
                minLength={8}
                required 
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all placeholder-slate-400 font-medium bg-slate-50/30 ${
                  senhaConfirm && senhaConfirm !== senhaPrincipal
                    ? 'border-red-400'
                    : 'border-slate-200'
                }`}
              />
              {senhaConfirm && senhaConfirm !== senhaPrincipal && (
                <p className="text-xs text-red-600 font-medium mt-1">As senhas não coincidem.</p>
              )}
            </div>


            {/* Dados do Docente */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Dados do Docente</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label htmlFor="cpf" className="block text-sm font-medium text-slate-700">CPF</label>
                    <input 
                      type="text" 
                      id="cpf" 
                      name="cpf" 
                      value={cpfValue}
                      onChange={handleCpfChange}
                      placeholder="000.000.000-00" 
                      required 
                      className={`w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all font-medium bg-white ${
                        cpfError ? 'border-red-400' : 'border-slate-200'
                      }`}
                    />
                    {cpfError && (
                      <p className="text-xs text-red-600 font-medium mt-1">{cpfError}</p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <label htmlFor="telefone" className="block text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                    <input 
                      type="tel" 
                      id="telefone" 
                      name="telefone" 
                      onChange={handleTelefoneChange}
                      placeholder="(99) 99999-9999" 
                      required 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all font-medium bg-white"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label htmlFor="vinculo" className="block text-sm font-medium text-slate-700">Vínculo Contratual</label>
                    <select
                      id="vinculo"
                      name="vinculo"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] transition-all font-medium bg-white"
                    >
                      <option value="Efetivo">Efetivo</option>
                      <option value="Contratado">Contratado</option>
                      <option value="Substituto">Substituto</option>
                    </select>
                  </div>
                </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white text-base font-bold py-4 px-4 rounded-xl shadow-lg shadow-[#0f2851]/20 transition-all flex items-center justify-center active:scale-95"
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
