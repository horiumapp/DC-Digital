import React, { useState } from 'react';
import { X, User, Mail, KeyRound, Loader2, Shield, Crown, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './common/Toast';

interface NovoUsuarioEscolarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cargo: 'GESTOR' | 'SECRETARIO';
  escolaId: string;
  escolaNome: string;
}

export default function NovoUsuarioEscolarModal({
  isOpen,
  onClose,
  onSuccess,
  cargo,
  escolaId,
  escolaNome,
}: NovoUsuarioEscolarModalProps) {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
  });

  if (!isOpen) return null;

  const cargoLabel = cargo === 'GESTOR' ? 'Gestor(a)' : 'Secretário(a)';
  const CargoIcon = cargo === 'GESTOR' ? Crown : Shield;
  const _cargoColor = cargo === 'GESTOR' ? 'amber' : 'blue';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validações locais
      if (!formData.nome.trim()) {
        showError('Informe o nome completo.');
        setLoading(false);
        return;
      }
      if (!formData.email.trim()) {
        showError('Informe o e-mail.');
        setLoading(false);
        return;
      }
      if (formData.senha.length < 6) {
        showError('A senha deve ter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }

      // Obter token do Admin logado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showError('Sessão expirada. Faça login novamente.');
        setLoading(false);
        return;
      }

      // Chamar a Edge Function
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          nome: formData.nome.trim(),
          email: formData.email.trim().toLowerCase(),
          senha: formData.senha,
          cargo: cargo,
          escola_id: escolaId,
        },
      });

      if (error) {
        showError(error.message || 'Erro ao criar conta.');
        setLoading(false);
        return;
      }

      // Verifica se a resposta contém erro do servidor
      if (data?.error) {
        showError(data.error);
        setLoading(false);
        return;
      }

      showSuccess(`${cargoLabel} ${formData.nome.trim()} cadastrado(a) com sucesso!`);

      // Limpar formulário
      setFormData({ nome: '', email: '', senha: '' });
      onSuccess();
    } catch (err: any) {
      showError('Erro inesperado: ' + (err.message || 'Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({ nome: '', email: '', senha: '' });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={cargo === 'GESTOR' ? 'w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center' : 'w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center'}>
              <CargoIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Cadastrar {cargoLabel}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                {escolaNome}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info box */}
          <div className={cargo === 'GESTOR' ? 'p-3 rounded-lg bg-amber-50 border border-amber-100' : 'p-3 rounded-lg bg-blue-50 border border-blue-100'}>
            <p className="text-xs text-slate-600 font-medium">
              {cargo === 'GESTOR'
                ? '⚡ O gestor terá acesso para cadastrar professores e gerenciar esta escola.'
                : '⚡ O secretário poderá cadastrar alunos e gerenciar turmas desta escola.'
              }
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Nome Completo
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] transition-all font-medium disabled:opacity-50 disabled:bg-slate-50"
              placeholder="Ex: Maria da Silva"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              E-mail de Acesso
            </label>
            <input
              type="email"
              required
              disabled={loading}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] transition-all font-medium disabled:opacity-50 disabled:bg-slate-50"
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-400" />
              Senha de Acesso
            </label>
            <input
              type="password"
              required
              disabled={loading}
              minLength={6}
              value={formData.senha}
              onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
              autoComplete="new-password"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] transition-all font-medium disabled:opacity-50 disabled:bg-slate-50"
              placeholder="Mínimo 6 caracteres"
            />
            <p className="text-[10px] text-slate-400 font-medium ml-1">
              Compartilhe essa senha com o(a) {cargoLabel.toLowerCase()}. Ele(a) poderá alterá-la depois.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#0f2851] hover:bg-[#1a3a6d] rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Cadastrar {cargoLabel}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
