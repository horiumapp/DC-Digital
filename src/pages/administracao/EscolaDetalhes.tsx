import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft, Building2, User, Shield, ClipboardList,
  Plus, Edit2, Trash2, Mail, MapPin, Hash, Activity,
  Loader2, Crown, KeyRound
} from 'lucide-react';
import NovoUsuarioEscolarModal from '../../components/NovoUsuarioEscolarModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import NovaEscolaModal from '../../components/NovaEscolaModal';
import { useToast } from '../../components/common/Toast';

interface EscolaDetalhesProps {
  escola: any;
  onVoltar: () => void;
  onEscolaAtualizada: () => void;
}

interface UsuarioEscolar {
  id: string;
  email: string;
  nome_completo: string;
  cargo: string;
  criado_em: string;
}

export default function EscolaDetalhes({ escola, onVoltar, onEscolaAtualizada }: EscolaDetalhesProps) {
  const { showError, showSuccess } = useToast();
  const [gestores, setGestores] = useState<UsuarioEscolar[]>([]);
  const [secretarios, setSecretarios] = useState<UsuarioEscolar[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de novo usuário
  const [isUsuarioModalOpen, setIsUsuarioModalOpen] = useState(false);
  const [cargoParaCadastrar, setCargoParaCadastrar] = useState<'GESTOR' | 'SECRETARIO'>('GESTOR');
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<UsuarioEscolar | null>(null);

  // Modal de confirmação de exclusão
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<UsuarioEscolar | null>(null);

  // Modal de edição da escola
  const [isEditEscolaModalOpen, setIsEditEscolaModalOpen] = useState(false);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome_completo, cargo, criado_em')
      .eq('escola_id', escola.id)
      .in('cargo', ['GESTOR', 'SECRETARIO'])
      .order('cargo')
      .order('nome_completo');

    if (error) {
      console.error('Erro ao buscar usuários da escola:', error);
      showError('Erro ao carregar equipe da escola.');
    } else if (data) {
      setGestores(data.filter(u => u.cargo === 'GESTOR'));
      setSecretarios(data.filter(u => u.cargo === 'SECRETARIO'));
    }
    setLoading(false);
  }, [escola.id, showError]);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const handleCadastrarGestor = () => {
    setCargoParaCadastrar('GESTOR');
    setUsuarioParaEditar(null);
    setIsUsuarioModalOpen(true);
  };

  const handleCadastrarSecretario = () => {
    setCargoParaCadastrar('SECRETARIO');
    setUsuarioParaEditar(null);
    setIsUsuarioModalOpen(true);
  };

  const handleUsuarioCriado = () => {
    setIsUsuarioModalOpen(false);
    setUsuarioParaEditar(null);
    fetchUsuarios();
  };

  const handleConfirmDelete = async () => {
    if (!usuarioParaExcluir) return;

    try {
      // Remover vínculo com a escola (não deleta a conta)
      const { error } = await supabase
        .from('usuarios')
        .update({ escola_id: null, cargo: 'PROFESSOR' })
        .eq('id', usuarioParaExcluir.id);

      if (error) {
        showError('Erro ao remover vínculo: ' + error.message);
      } else {
        showSuccess(`${usuarioParaExcluir.nome_completo} foi desvinculado(a) desta escola.`);
        fetchUsuarios();
      }
    } catch {
      showError('Erro inesperado ao remover vínculo.');
    }
    setUsuarioParaExcluir(null);
  };

  const handleSaveEscola = async (dadosEscola: any) => {
    const { error } = await supabase
      .from('escolas')
      .update({
        nome: dadosEscola.nome,
        distrito: dadosEscola.localizacao,
        inep: dadosEscola.inep,
        diretor: dadosEscola.gestor,
        status: dadosEscola.ativo ? 'Ativa' : 'Inativa'
      })
      .eq('id', escola.id);

    if (error) {
      showError('Erro ao atualizar escola: ' + error.message);
    } else {
      showSuccess('Dados da escola atualizados!');
      onEscolaAtualizada();
    }
    setIsEditEscolaModalOpen(false);
  };

  const escolaParaModal = {
    ...escola,
    localizacao: escola.distrito,
    gestor: escola.diretor,
    ativo: escola.status === 'Ativa'
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Banner / Header */}
      <div className="bg-[#0f2851] p-8 relative overflow-hidden shrink-0">
        <Building2 className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 pointer-events-none rotate-12" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <button
              onClick={onVoltar}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-white/80" />
                <h1 className="text-2xl font-black text-white tracking-widest uppercase">
                  {escola.nome}
                </h1>
              </div>
              <div className="flex items-center gap-4 mt-1">
                {escola.inep && (
                  <span className="text-blue-100/70 text-sm font-bold">
                    INEP: {escola.inep}
                  </span>
                )}
                {escola.distrito && (
                  <span className="text-blue-100/70 text-sm font-medium">
                    · {escola.distrito}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-[10px] font-black text-blue-100 uppercase tracking-tighter">GESTORES</span>
              <span className="text-2xl font-black text-white leading-none mt-1">
                {gestores.length.toString().padStart(2, '0')}
              </span>
            </div>
            <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center min-w-[80px]">
              <span className="text-[10px] font-black text-blue-100 uppercase tracking-tighter">SECRETÁRIOS</span>
              <span className="text-2xl font-black text-white leading-none mt-1">
                {secretarios.length.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#0f2851] animate-spin" />
          </div>
        ) : (
          <>
            {/* Bloco: Direção Escolar (Gestor) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-amber-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Direção Escolar</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Gestor(a) responsável pela unidade</p>
                  </div>
                </div>
                {gestores.length === 0 && (
                  <button
                    onClick={handleCadastrarGestor}
                    className="flex items-center gap-2 bg-[#0f2851] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Cadastrar Gestor
                  </button>
                )}
              </div>

              <div className="p-5">
                {gestores.length > 0 ? (
                  <div className="space-y-3">
                    {gestores.map(gestor => (
                      <div
                        key={gestor.id}
                        className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-amber-200 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm">
                            {gestor.nome_completo?.split(' ').slice(0, 2).map(n => n[0]).join('') || '?'}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{gestor.nome_completo}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">{gestor.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setUsuarioParaExcluir(gestor)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desvincular"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Crown className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium italic">
                      Nenhum gestor cadastrado para esta escola.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Clique em "Cadastrar Gestor" para vincular um diretor(a).
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco: Secretaria */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Secretaria</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Equipe de secretários da escola</p>
                  </div>
                </div>
                <button
                  onClick={handleCadastrarSecretario}
                  className="flex items-center gap-2 bg-[#0f2851] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Secretário
                </button>
              </div>

              <div className="p-5">
                {secretarios.length > 0 ? (
                  <div className="space-y-3">
                    {secretarios.map(sec => (
                      <div
                        key={sec.id}
                        className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm">
                            {sec.nome_completo?.split(' ').slice(0, 2).map(n => n[0]).join('') || '?'}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{sec.nome_completo}</h4>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="text-xs text-slate-500">{sec.email}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setUsuarioParaExcluir(sec)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desvincular"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium italic">
                      Nenhum secretário cadastrado para esta escola.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bloco: Dados da Escola */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Dados da Escola</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Informações cadastrais da unidade</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditEscolaModalOpen(true)}
                  className="flex items-center gap-2 text-slate-500 hover:text-[#0f2851] px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors border border-slate-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</span>
                    <p className="text-sm font-bold text-slate-800">{escola.nome}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">INEP</span>
                    <p className="text-sm font-bold text-slate-800">{escola.inep || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Localização</span>
                    <p className="text-sm font-bold text-slate-800">{escola.distrito || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${
                      escola.status === 'Ativa'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {escola.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diretor (Texto)</span>
                    <p className="text-sm font-bold text-slate-800">{escola.diretor || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modais */}
      <NovoUsuarioEscolarModal
        isOpen={isUsuarioModalOpen}
        onClose={() => {
          setIsUsuarioModalOpen(false);
          setUsuarioParaEditar(null);
        }}
        onSuccess={handleUsuarioCriado}
        cargo={cargoParaCadastrar}
        escolaId={escola.id}
        escolaNome={escola.nome}
      />

      <ConfirmActionModal
        isOpen={!!usuarioParaExcluir}
        onClose={() => setUsuarioParaExcluir(null)}
        onConfirm={handleConfirmDelete}
        title="Desvincular Usuário"
        message={
          <>
            Tem certeza que deseja desvincular <strong>{usuarioParaExcluir?.nome_completo}</strong> desta escola?
            O acesso será rebaixado para Professor.
          </>
        }
      />

      <NovaEscolaModal
        isOpen={isEditEscolaModalOpen}
        onClose={() => setIsEditEscolaModalOpen(false)}
        onSave={handleSaveEscola}
        escolaParaEditar={escolaParaModal}
      />
    </div>
  );
}
