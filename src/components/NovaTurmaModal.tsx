import React, { useState, useEffect } from 'react';
import { X, Building2, Users, Clock, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NovaTurmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (turma: any) => void;
  turmaParaEditar?: any;
}

export default function NovaTurmaModal({ isOpen, onClose, onSave, turmaParaEditar }: NovaTurmaModalProps) {
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    escola_id: '',
    nome: '',
    turno: 'Manhã',
    ano_letivo: new Date().getFullYear().toString(),
  });

  // Busca as escolas ativas assim que o Modal abre para popular o Dropdown
  useEffect(() => {
    if (isOpen) {
      fetchEscolas();
    }
  }, [isOpen]);

  const fetchEscolas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('escolas')
      .select('id, nome')
      .eq('status', 'Ativa')
      .order('nome');
      
    if (!error && data) {
      setEscolas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (turmaParaEditar) {
      setFormData({
        escola_id: turmaParaEditar.escola_id || (escolas.length > 0 ? escolas[0].id : ''),
        nome: turmaParaEditar.nome || '',
        turno: turmaParaEditar.turno || 'Manhã',
        ano_letivo: turmaParaEditar.ano_letivo || new Date().getFullYear().toString(),
      });
    } else {
      setFormData({
        escola_id: escolas.length > 0 ? escolas[0].id : '',
        nome: '',
        turno: 'Manhã',
        ano_letivo: new Date().getFullYear().toString(),
      });
    }
  }, [turmaParaEditar, isOpen, escolas]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.escola_id) {
        alert("Por favor, selecione uma escola para essa turma.");
        return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-800">
            {turmaParaEditar ? 'Editar Turma' : 'Nova Turma'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Campo Crítico: A Relação com a Escola */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Escola Pertencente
            </label>
            <select
              required
              disabled={loading}
              value={formData.escola_id}
              onChange={(e) => setFormData({ ...formData, escola_id: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white"
            >
              {loading ? (
                <option value="">Carregando escolas...</option>
              ) : escolas.length === 0 ? (
                <option value="">Nenhuma escola Ativa encontrada</option>
              ) : (
                <>
                  <option value="" disabled>Selecione a Escola</option>
                  {escolas.map(escola => (
                    <option key={escola.id} value={escola.id}>{escola.nome}</option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" />
              Nome da Turma
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              placeholder="Ex: 9º Ano A"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Turno
              </label>
              <select
                required
                value={formData.turno}
                onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white"
              >
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
                <option value="Integral">Integral</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                Ano Letivo
              </label>
              <input
                type="text"
                required
                maxLength={4}
                value={formData.ano_letivo}
                onChange={(e) => setFormData({ ...formData, ano_letivo: e.target.value.replace(/\D/g, '') })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                placeholder="Ex: 2026"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formData.escola_id}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {turmaParaEditar ? 'Salvar Alterações' : 'Criar Turma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
