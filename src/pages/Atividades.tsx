import React, { useState } from 'react';
import { ArrowLeft, Plus, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { APP_CONFIG } from '../config/appConfig';
import TurmaHeaderInfo from '../components/common/TurmaHeaderInfo';

export default function Atividades() {
  const { turmaAtiva } = useTurma();
  const [isCreating, setIsCreating] = useState(false);
  const year = APP_CONFIG.YEAR;
  
  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 relative">
        <Link to="/turmas" className="px-6 py-3 bg-[#0f2851] text-white font-bold rounded-xl shadow-lg">Voltar para Turmas</Link>
      </div>
    );
  }

        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/diario" className="flex items-center gap-1 px-4 py-2 bg-[#eef2ff] text-[#0f2851] text-sm font-bold rounded-xl border border-blue-100 hover:bg-[#e0e7ff] transition">
              <ArrowLeft className="w-4 h-4" /> 
              Voltar
            </Link>
            <h2 className="text-xl font-medium text-slate-700 dark:text-slate-100">
              {turmaAtiva.ensino} - {turmaAtiva.fase}
              <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full border border-green-200 ml-2">Ano: {year}</span>
            </h2>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <TurmaHeaderInfo turmaAtiva={turmaAtiva} />
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[450px]">
          {!isCreating ? (
            <>
              {/* Header List View */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-slate-700">Atividades da Turma</h3>
                <button 
                  onClick={() => setIsCreating(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0f2851] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-md shadow-[#0f2851]/10"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar atividade
                </button>
              </div>

              {/* Empty State */}
              <div className="p-6">
                <div className="bg-[#fde2e2] border border-[#f5c6c6] rounded p-4">
                  <h4 className="text-[#a42b2b] font-medium text-[15px] mb-1">Aviso</h4>
                  <p className="text-[#a42b2b]/90 text-[13.5px]">A turma ainda não possui atividades cadastradas</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Header Form View */}
              <div className="p-6 border-b border-slate-100">
                <h3 className="text-base font-medium text-slate-700">Cadastrar atividade</h3>
              </div>

              {/* Form View */}
              <div className="p-6 pb-12 space-y-5 max-w-5xl">
                <div>
                  <label className="block text-[13px] text-slate-700 mb-1.5">Descrição</label>
                  <textarea 
                    className="w-full bg-[#f8f9fa] border border-slate-200 rounded p-3 text-[13px] focus:outline-none focus:border-[#0f2851] focus:bg-white min-h-[90px] resize-none"
                    maxLength={100}
                  ></textarea>
                  <p className="text-[11px] text-slate-400 mt-1">Tamanho máximo: 100 caracteres</p>
                </div>

                <div>
                  <label className="block text-[13px] text-slate-700 mb-1.5">Unidade didática</label>
                  <select className="w-full bg-white border border-slate-200 rounded px-3 py-2.5 text-[13px] text-slate-600 focus:outline-none focus:border-[#0f2851]">
                    <option>Selecione uma unidade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[13px] text-slate-700 mb-1.5">Objetos de Conhecimento:</label>
                  <div className="w-full bg-[#f8f9fa] border border-slate-200 rounded px-3 py-2.5 text-[13px] text-slate-500 h-[40px] flex items-center">
                    Selecione uma unidade didática para visualizar os Objetos de conhecimento.
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] text-slate-700 mb-1.5">Anexo</label>
                  <div className="flex items-center w-full bg-[#f8f9fa] border border-slate-200 rounded overflow-hidden text-[13px]">
                    <button className="bg-white border-r border-slate-200 px-3 py-2 font-medium text-slate-600 hover:bg-slate-50 transition border-y-0 border-l-0">Escolher arquivo</button>
                    <span className="px-3 text-slate-400">Nenhum arquivo escolhido</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Tamanho máximo do arquivo: 5MB</p>
                </div>

                <div className="grid grid-cols-[1fr_1fr_2fr] gap-6 max-w-3xl">
                  <div>
                    <label className="block text-[13px] text-slate-700 mb-1.5">Data Inicial:</label>
                    <div className="relative group">
                      <input type="date" className="w-full bg-[#f8f9fa] border border-slate-200 rounded pl-3 pr-10 py-2 text-[13px] text-slate-600 focus:outline-none focus:border-[#0f2851] h-[38px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10" />
                      <div className="absolute right-0 top-0 bottom-0 w-10 bg-[#0f2851] rounded-r flex items-center justify-center text-white pointer-events-none">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[13px] text-slate-700 mb-1.5">Data Entrega:</label>
                    <div className="relative group">
                      <input type="date" className="w-full bg-[#f8f9fa] border border-slate-200 rounded pl-3 pr-10 py-2 text-[13px] text-slate-600 focus:outline-none focus:border-[#0f2851] h-[38px] [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:z-10" />
                      <div className="absolute right-0 top-0 bottom-0 w-10 bg-[#0f2851] rounded-r flex items-center justify-center text-white pointer-events-none">
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                  <button className="px-5 py-2 bg-[#0f2851] hover:bg-[#1a3a6d] text-white rounded text-[13px] font-bold transition shadow-sm">
                    Adicionar
                  </button>
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded text-[13px] font-medium transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
