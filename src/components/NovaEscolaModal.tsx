import React, { useState, useEffect } from 'react';
import { X, Building2, MapPin, Hash, User, Activity, Image as ImageIcon } from 'lucide-react';
import logosLocais from '../config/logos.json';

export interface NovaEscolaData {
  nome: string;
  localizacao: string;
  inep: string;
  gestor: string;
  ativo: boolean;
  logo_url: string;
}

export interface EscolaEditTarget {
  id?: string;
  nome?: string;
  distrito?: string;
  inep?: string;
  diretor?: string;
  status?: string;
  logo_url?: string;
}

interface NovaEscolaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (escola: NovaEscolaData) => void;
  escolaParaEditar?: EscolaEditTarget | null;
}

export default function NovaEscolaModal({ isOpen, onClose, onSave, escolaParaEditar }: NovaEscolaModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    localizacao: '',
    inep: '',
    gestor: '',
    ativo: true,
    logo_url: '',
  });

   
  useEffect(() => {
    if (escolaParaEditar) {
      setFormData({
        nome: escolaParaEditar.nome || '',
        localizacao: escolaParaEditar.distrito || '', // assuming the table uses 'distrito'
        inep: escolaParaEditar.inep || '',
        gestor: escolaParaEditar.diretor || '',
        ativo: escolaParaEditar.status === 'Ativa',
        logo_url: escolaParaEditar.logo_url || '',
      });
    } else {
      setFormData({
        nome: '',
        localizacao: '',
        inep: '',
        gestor: '',
        ativo: true,
        logo_url: '',
      });
    }
  }, [escolaParaEditar, isOpen]);
   

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    // Reset form
    setFormData({
      nome: '',
      localizacao: '',
      inep: '',
      gestor: '',
      ativo: true,
      logo_url: '',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">
            {escolaParaEditar ? 'Editar Escola' : 'Nova Escola'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Nome da Escola
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              placeholder="Ex: E.M.E.F. Machado de Assis"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Localização
            </label>
            <input
              type="text"
              required
              value={formData.localizacao}
              onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              placeholder="Ex: Centro"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" />
              INEP
            </label>
            <input
              type="text"
              required
              value={formData.inep}
              onChange={(e) => setFormData({ ...formData, inep: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              placeholder="Código INEP"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              Gestor
            </label>
            <input
              type="text"
              required
              value={formData.gestor}
              onChange={(e) => setFormData({ ...formData, gestor: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              placeholder="Nome do diretor(a)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-slate-400" />
                Logo da Escola
              </div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Local ou URL</span>
            </label>
            <div className="grid grid-cols-[1fr,auto] gap-2">
              <select
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white text-sm"
              >
                <option value="">Sem Logo</option>
                <optgroup label="Logos Locais (Pasta Public)">
                  {logosLocais.map((logo) => (
                    <option key={logo} value={logo}>
                      {logo.replace('/', '')}
                    </option>
                  ))}
                </optgroup>
              </select>
              {formData.logo_url && (
                <div className="w-11 h-11 border border-slate-200 rounded-lg p-1 flex items-center justify-center bg-slate-50">
                  <img src={formData.logo_url} alt="Preview" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Selecione uma logo da lista ou cole uma URL externa abaixo.
            </p>
            <input
              type="text"
              value={formData.logo_url.startsWith('/') ? '' : formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-xs"
              placeholder="Ou cole uma URL externa aqui..."
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 pb-1">
              <Activity className="w-4 h-4 text-slate-400" />
              Status
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.ativo === true}
                  onChange={() => setFormData({ ...formData, ativo: true })}
                  className="text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-700">Ativa</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status"
                  checked={formData.ativo === false}
                  onChange={() => setFormData({ ...formData, ativo: false })}
                  className="text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-700">Inativa</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
            >
              {escolaParaEditar ? 'Salvar Alterações' : 'Salvar Escola'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
