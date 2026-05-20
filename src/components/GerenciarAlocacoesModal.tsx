import React, { useState, useEffect } from 'react';
import { X, Building2, Clock, Plus, Trash2, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface GerenciarAlocacoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  professor: any;
  onAlocacoesChanged: () => void;
}

export default function GerenciarAlocacoesModal({ isOpen, onClose, professor, onAlocacoesChanged }: GerenciarAlocacoesModalProps) {
  const [escolas, setEscolas] = useState<any[]>([]);
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [novaAlocacao, setNovaAlocacao] = useState({
    escola_id: '',
    turno: 'Manhã',
  });

  const fetchEscolas = React.useCallback(async () => {
    const { data } = await supabase.from('escolas').select('id, nome').eq('status', 'Ativa').order('nome');
    if (data) setEscolas(data);
  }, []);

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const fetchAlocacoes = React.useCallback(async () => {
    if (!professor?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('professor_alocacoes')
      .select('id, escola_id, turno, escolas(nome)')
      .eq('professor_id', professor.id)
      .order('turno');
      
    if (error) {
       console.error("Erro ao buscar alocações", error);
    } else if (data) {
      setAlocacoes(data);
    }
    setLoading(false);
  }, [professor?.id]);

  useEffect(() => {
    if (isOpen && professor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchEscolas();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAlocacoes();
    }
  }, [isOpen, professor, fetchEscolas, fetchAlocacoes]);

  const handleAddAlocacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaAlocacao.escola_id) {
      alert("Selecione uma escola.");
      return;
    }

    // Check if already allocated for the exact same school and shift
    const jaExiste = alocacoes.find(
      a => a.escola_id === novaAlocacao.escola_id && a.turno === novaAlocacao.turno
    );

    if (jaExiste) {
      alert("Este professor já está alocado nessa escola nesse mesmo turno.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('professor_alocacoes').insert([{
      professor_id: professor.id,
      escola_id: novaAlocacao.escola_id,
      turno: novaAlocacao.turno
    }]);

    if (error) {
      console.error(error);
      alert("Erro ao adicionar alocação. Certifique-se de ter criado a tabela professor_alocacoes primeiro.");
    } else {
      setNovaAlocacao({ escola_id: '', turno: 'Manhã' });
      await fetchAlocacoes();
      onAlocacoesChanged();
    }
    setLoading(false);
  };

  const handleDeleteAlocacao = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from('professor_alocacoes').delete().eq('id', id);
    if (error) {
      alert("Erro ao remover alocação.");
    } else {
      await fetchAlocacoes();
      onAlocacoesChanged();
    }
    setLoading(false);
  };

  if (!isOpen || !professor) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Gerenciar Alocações</h2>
            <p className="text-sm text-slate-500 mt-1">
              Professor(a): <span className="font-semibold text-slate-700">{professor.nome}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-6">
          <form onSubmit={handleAddAlocacao} className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-600" />
              Nova Alocação
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Escola
                </label>
                <select
                  required
                  value={novaAlocacao.escola_id}
                  onChange={(e) => setNovaAlocacao({ ...novaAlocacao, escola_id: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white text-sm"
                >
                  <option value="" disabled>Selecione uma escola</option>
                  {escolas.map(escola => (
                    <option key={escola.id} value={escola.id}>{escola.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Turno
                </label>
                <select
                  required
                  value={novaAlocacao.turno}
                  onChange={(e) => setNovaAlocacao({ ...novaAlocacao, turno: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-white text-sm"
                >
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Noite">Noite</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Adicionando...' : 'Adicionar Vínculo'}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-100 pb-2">
              Locações Atuais ({alocacoes.length})
            </h3>
            
            {alocacoes.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 border border-slate-100 rounded-xl border-dashed">
                <MapPin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Este professor ainda não possui escolas vinculadas.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {alocacoes.map((aloc) => (
                  <div key={aloc.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{aloc.escolas?.nome || 'Escola Desconhecida'}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Turno: {aloc.turno}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAlocacao(aloc.id)}
                      disabled={loading}
                      className="mt-3 sm:mt-0 self-end sm:self-auto p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Remover alocação"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-slate-200 bg-slate-50 sticky bottom-0 z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors shadow-sm"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
