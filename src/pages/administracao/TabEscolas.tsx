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
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-slate-50/50 transition-all font-bold text-[#0f2851]"
            />
          </div>
          <button
            onClick={() => {
              setEscolaParaEditar(null);
              setIsNovaEscolaModalOpen(true);
            }}
            className="flex items-center gap-2 bg-[#0f2851] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 active:scale-95 shrink-0 h-[38px]"
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
                className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                {/* Actions (Top Right - Hover Only) */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0 duration-300 z-10">
                  <button 
                    onClick={() => handleEditEscola(escola)}
                    className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-[#0f2851] shadow-sm border border-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setEscolaParaExcluir(escola)}
                    className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-600 shadow-sm border border-slate-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Background Decoration */}
                <div className="absolute -top-4 -right-4 p-4 opacity-5 pointer-events-none">
                  <Building2 className="w-20 h-20 text-blue-900" />
                </div>

                <div className="flex items-start justify-between mb-4">
                  {/* Main Icon */}
                  <div className="w-10 h-10 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center group-hover:bg-[#0f2851] group-hover:text-white transition-colors duration-300">
                    <Building2 className="w-5 h-5" />
                  </div>

                  {/* Status Badge */}
                  <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                      escola.status === 'Ativa' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {escola.status}
                    </span>
                  </div>
                </div>

                {/* Nome e INEP */}
                <div className="mb-4">
                  <h3 className="font-bold text-slate-800 text-base leading-tight group-hover:text-[#0f2851] transition-colors pr-10">
                    {escola.nome}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-slate-400">
                    <span className="text-[10px] font-bold uppercase tracking-tighter">INEP:</span>
                    <span className="text-[10px] font-black tabular-nums">{escola.inep || '---'}</span>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="space-y-2 mt-auto text-slate-500">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] font-medium leading-tight line-clamp-2">{escola.distrito || 'Endereço não cadastrado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-600 truncate">{escola.diretor || 'Diretor N/D'}</span>
                  </div>
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
