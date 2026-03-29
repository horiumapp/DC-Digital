import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, Building2, MapPin, User, Hash, ChevronRight } from 'lucide-react';
import NovaEscolaModal from '../../components/NovaEscolaModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';

export default function TabEscolas() {
  const { user } = useAuth();
  const [buscaEscola, setBuscaEscola] = useState('');
  const [isNovaEscolaModalOpen, setIsNovaEscolaModalOpen] = useState(false);
  const [escolaParaEditar, setEscolaParaEditar] = useState<any>(null);
  const [escolaParaExcluir, setEscolaParaExcluir] = useState<any>(null);

  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEscolas();
  }, []);

  const fetchEscolas = async () => {
    const { data, error } = await supabase
      .from('escolas')
      .select('*')
      .order('nome');
    
    if (!error && data) {
      setEscolas(data);
    }
    setLoading(false);
  };

  const handleSaveEscola = async (novaEscola: any) => {
    if (escolaParaEditar) {
      const { error } = await supabase
        .from('escolas')
        .update({
          nome: novaEscola.nome,
          distrito: novaEscola.localizacao,
          inep: novaEscola.inep,
          diretor: novaEscola.gestor,
          status: novaEscola.ativo ? 'Ativa' : 'Inativa'
        })
        .eq('id', escolaParaEditar.id);

      if (error) {
        console.error("Erro ao atualizar:", error);
        alert("Erro ao atualizar escola: " + error.message);
      } else {
        fetchEscolas();
        setEscolaParaEditar(null);
        setIsNovaEscolaModalOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('escolas')
        .insert([{
          nome: novaEscola.nome,
          distrito: novaEscola.localizacao,
          inep: novaEscola.inep,
          diretor: novaEscola.gestor,
          status: novaEscola.ativo ? 'Ativa' : 'Inativa'
        }]);

      if (error) {
        console.error("Erro ao inserir:", error);
        alert("Erro ao criar escola: " + error.message);
      } else {
        fetchEscolas();
        setEscolaParaEditar(null);
        setIsNovaEscolaModalOpen(false);
      }
    }
  };

  const handleEditEscola = (escola: any) => {
    // NovaEscolaModal expects 'localizacao' instead of 'distrito', etc.
    const escolaParaModal = {
      ...escola,
      localizacao: escola.distrito,
      gestor: escola.diretor,
      ativo: escola.status === 'Ativa'
    };
    setEscolaParaEditar(escolaParaModal);
    setIsNovaEscolaModalOpen(true);
  };

  const confirmDeleteEscola = async () => {
    if (escolaParaExcluir) {
      const { error } = await supabase
        .from('escolas')
        .delete()
        .eq('id', escolaParaExcluir.id);

      if (!error) fetchEscolas();
      setEscolaParaExcluir(null);
    }
  };

  const escolasFiltradas = escolas.filter(e => 
    e.nome.toLowerCase().includes(buscaEscola.toLowerCase()) || 
    (e.inep && e.inep.includes(buscaEscola)) ||
    (e.diretor && e.diretor.toLowerCase().includes(buscaEscola.toLowerCase()))
  );

  if (user?.role !== 'ADMIN') return null;

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4 bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Gerenciamento de Escolas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Administre as unidades escolares do município.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={buscaEscola}
              onChange={(e) => setBuscaEscola(e.target.value)}
              placeholder="Nome, INEP ou Diretor..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50 transition-all font-medium"
            />
          </div>
          <button
            onClick={() => {
              setEscolaParaEditar(null);
              setIsNovaEscolaModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/10 shrink-0 h-[38px]"
          >
            <Plus className="w-4 h-4" />
            Nova Escola
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {escolasFiltradas.length > 0 ? (
            escolasFiltradas.map((escola) => (
              <div 
                key={escola.id} 
                className="group relative flex flex-col bg-white border border-slate-200 rounded-3xl p-6 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                {/* Background Decoration */}
                <div className="absolute -top-4 -right-4 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 className="w-24 h-24 text-blue-900" />
                </div>

                {/* Status Badge */}
                <div className="absolute top-6 right-6">
                  <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    escola.status === 'Ativa' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {escola.status}
                  </span>
                </div>

                {/* Main Icon */}
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Building2 className="w-6 h-6" />
                </div>

                {/* Nome */}
                <h3 className="font-black text-slate-800 text-lg leading-tight mb-4 group-hover:text-blue-700 transition-colors pr-12 line-clamp-2 min-h-[3.5rem]">
                  {escola.nome}
                </h3>

                {/* Meta Info */}
                <div className="space-y-3.5 mb-6 text-slate-500">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[13px] font-medium leading-tight">{escola.distrito || 'Endereço não cadastrado'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-[13px] font-bold text-slate-600">{escola.diretor || 'Diretor N/D'}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="text-[13px] font-bold text-slate-500 tabular-nums">INEP: {escola.inep || '---'}</span>
                  </div>
                </div>

                {/* Actions Bottom Bar (Discrete & Animated) */}
                <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditEscola(escola)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Escola"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setEscolaParaExcluir(escola)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Escola"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button 
                    onClick={() => {/* Poderia ser uma navegação para estatísticas da escola */}}
                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    Detalhes <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium italic">Nenhuma escola cadastrada ou encontrada na busca.</p>
            </div>
          )}
        </div>
      </div>

      <NovaEscolaModal
        isOpen={isNovaEscolaModalOpen}
        onClose={() => {
          setIsNovaEscolaModalOpen(false);
          setEscolaParaEditar(null);
        }}
        onSave={handleSaveEscola}
        escolaParaEditar={escolaParaEditar}
      />

      <ConfirmActionModal
        isOpen={!!escolaParaExcluir}
        onClose={() => setEscolaParaExcluir(null)}
        onConfirm={confirmDeleteEscola}
        title="Excluir Escola"
        message={
          <>
            Tem certeza que deseja excluir a escola <strong>{escolaParaExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
          </>
        }
      />
    </div>
  );
}
