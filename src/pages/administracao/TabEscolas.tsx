import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, Building2, MapPin, User, UserCheck, Download, Upload } from 'lucide-react';
import NovaEscolaModal from '../../components/NovaEscolaModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import EscolaDetalhes from './EscolaDetalhes';
import ImportCsvModal, { type PreviewColumn } from '../../components/common/ImportCsvModal';
import {
  exportEscolasToCsv,
  getEscolaTemplateCsv,
  parseEscolasCsv,
  downloadCsvFile
} from '../../utils/csvImportExport';

import { useToast } from '../../components/common/Toast';

export interface EscolaRow {
  id: string;
  nome: string;
  distrito?: string;
  inep?: string;
  diretor?: string;
  secretario?: string;
  status?: string;
  logo_url?: string;
}

export interface EscolaFormData {
  nome: string;
  localizacao?: string;
  inep?: string;
  gestor?: string;
  secretario?: string;
  ativo?: boolean;
  logo_url?: string;
}

export default function TabEscolas() {
  const { user: _user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [buscaEscola, setBuscaEscola] = useState('');
  const [isNovaEscolaModalOpen, setIsNovaEscolaModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [escolaParaEditar, setEscolaParaEditar] = useState<EscolaRow & EscolaFormData | null>(null);
  const [escolaParaExcluir, setEscolaParaExcluir] = useState<EscolaRow | null>(null);
  const [escolaSelecionada, setEscolaSelecionada] = useState<EscolaRow | null>(null);

  const [escolas, setEscolas] = useState<EscolaRow[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEscolas();
  }, []);

  async function fetchEscolas() {
    const { data, error } = await supabase
      .from('escolas')
      .select('id, nome, distrito, inep, diretor, secretario, status, logo_url')
      .order('nome');
    
    if (!error && data) {
      setEscolas(data);
    }
    setLoading(false);
  };

  const handleSaveEscola = async (novaEscola: EscolaFormData) => {
    if (escolaParaEditar) {
      const { error } = await supabase
        .from('escolas')
        .update({
          nome: novaEscola.nome,
          distrito: novaEscola.localizacao,
          inep: novaEscola.inep,
          diretor: novaEscola.gestor,
          secretario: novaEscola.secretario || null,
          status: novaEscola.ativo ? 'Ativa' : 'Inativa',
          logo_url: novaEscola.logo_url
        })
        .eq('id', escolaParaEditar.id);

      if (error) {
        console.error("Erro ao atualizar:", error);
        showError("Erro ao atualizar escola: " + error.message);
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
          secretario: novaEscola.secretario || null,
          status: novaEscola.ativo ? 'Ativa' : 'Inativa',
          logo_url: novaEscola.logo_url
        }]);

      if (error) {
        console.error("Erro ao inserir:", error);
        showError("Erro ao criar escola: " + error.message);
      } else {
        fetchEscolas();
        setEscolaParaEditar(null);
        setIsNovaEscolaModalOpen(false);
      }
    }
  };

  const handleEditEscola = (escola: EscolaRow) => {
    // NovaEscolaModal expects 'localizacao' instead of 'distrito', etc.
    const escolaParaModal = {
      ...escola,
      localizacao: escola.distrito,
      gestor: escola.diretor,
      secretario: escola.secretario,
      ativo: escola.status === 'Ativa',
      logo_url: escola.logo_url
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

  const handleExportEscolas = () => {
    if (escolas.length === 0) {
      showWarning('Nenhuma escola disponível para exportar.');
      return;
    }
    const csvContent = exportEscolasToCsv(escolas);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(csvContent, `escolas_${dateStr}.csv`);
    showSuccess(`Escolas exportadas com sucesso (${escolas.length} registros)!`);
  };

  const handleSaveImportEscolas = async (items: Array<{
    nome: string;
    distrito?: string;
    inep?: string;
    diretor?: string;
    secretario?: string;
    status: string;
  }>) => {
    const payload = items.map(item => ({
      nome: item.nome,
      distrito: item.distrito || null,
      inep: item.inep || null,
      diretor: item.diretor || null,
      secretario: item.secretario || null,
      status: item.status || 'Ativa'
    }));

    const { error } = await supabase.from('escolas').insert(payload);
    if (error) {
      console.error('Erro ao importar escolas:', error);
      throw new Error(error.message || 'Erro ao salvar escolas importadas.');
    }
    await fetchEscolas();
  };

  const escolaPreviewColumns: PreviewColumn<{
    nome: string;
    distrito?: string;
    inep?: string;
    diretor?: string;
    secretario?: string;
    status: string;
  }>[] = [
    { header: 'Nome da Escola', accessor: (item) => <span className="font-semibold text-slate-800">{item.nome}</span> },
    { header: 'Distrito / Endereço', accessor: (item) => <span className="text-slate-600">{item.distrito || '—'}</span> },
    { header: 'INEP', accessor: (item) => <span className="font-mono text-xs">{item.inep || '—'}</span> },
    { header: 'Diretor(a)', accessor: (item) => <span className="text-slate-600">{item.diretor || '—'}</span> },
    { header: 'Secretário(a)', accessor: (item) => <span className="text-slate-600">{item.secretario || '—'}</span> },
    {
      header: 'Status',
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.status === 'Inativa' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {item.status || 'Ativa'}
        </span>
      )
    }
  ];

  const escolasFiltradas = escolas.filter(e => 
    e.nome.toLowerCase().includes(buscaEscola.toLowerCase()) || 
    (e.inep && e.inep.includes(buscaEscola)) ||
    (e.diretor && e.diretor.toLowerCase().includes(buscaEscola.toLowerCase())) ||
    (e.secretario && e.secretario.toLowerCase().includes(buscaEscola.toLowerCase()))
  );

  if (_user?.role !== 'ADMIN') return null;

  // Se uma escola está selecionada, mostrar os detalhes dela
  if (escolaSelecionada) {
    return (
      <EscolaDetalhes
        escola={escolaSelecionada}
        onVoltar={() => {
          setEscolaSelecionada(null);
          fetchEscolas();
        }}
        onEscolaAtualizada={() => {
          fetchEscolas();
          // Atualizar os dados da escola selecionada
          const updated = escolas.find(e => e.id === escolaSelecionada.id);
          if (updated) setEscolaSelecionada(updated);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 gap-4 bg-white">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            Gerenciamento de Escolas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Administre as unidades escolares do município.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-56">
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
            onClick={handleExportEscolas}
            disabled={escolas.length === 0}
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-[38px]"
            title="Exportar escolas cadastradas para CSV"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar CSV
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 border border-blue-200 shrink-0 h-[38px]"
            title="Importar escolas em lote via CSV ou TXT"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            Importar TXT / Planilha
          </button>
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
                onClick={() => setEscolaSelecionada(escola)}
                className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden cursor-pointer"
              >
                {/* Actions (Top Right - Hover Only) */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0 duration-300 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEditEscola(escola); }}
                    className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-[#0f2851] shadow-sm border border-slate-100 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEscolaParaExcluir(escola); }}
                    className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-600 shadow-sm border border-slate-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Logo and Status (Top Right) */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  {escola.logo_url ? (
                    <div className="w-14 h-14 bg-white rounded-xl p-1 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                      <img 
                        src={(/^https?:\/\//.test(escola.logo_url) || escola.logo_url.startsWith('data:image/') || escola.logo_url.startsWith('/')) ? escola.logo_url : undefined} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain" 
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 opacity-20">
                      <Building2 className="w-8 h-8 text-[#0f2851]" />
                    </div>
                  )}

                  {/* Status Badge */}
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                    escola.status === 'Ativa' 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                      : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}>
                    {escola.status}
                  </span>
                </div>

                <div className="flex items-start mb-4">
                  {/* Main Icon (Always Building for consistency or Logo if small) */}
                  <div className="w-10 h-10 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center group-hover:bg-[#0f2851] group-hover:text-white transition-colors duration-300">
                    <Building2 className="w-5 h-5" />
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
                  {escola.secretario && (
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 truncate">Sec: {escola.secretario}</span>
                    </div>
                  )}
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

      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Importação de Escolas em Lote"
        subtitle="Importe dados cadastrais de escolas a partir de arquivo Excel (.csv) ou texto tabulado"
        templateFileName="modelo_importacao_escolas.csv"
        templateCsvContent={getEscolaTemplateCsv()}
        parseFn={parseEscolasCsv}
        onSave={handleSaveImportEscolas}
        previewColumns={escolaPreviewColumns}
        entityNamePlural="escolas"
      />
    </div>
  );
}
