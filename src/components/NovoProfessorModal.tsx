import React, { useState, useEffect } from 'react';
import { X, User, Mail, CreditCard, Phone, Activity, Briefcase } from 'lucide-react';

interface NovoProfessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (professor: any) => void;
  professorParaEditar?: any;
}

export default function NovoProfessorModal({ isOpen, onClose, onSave, professorParaEditar }: NovoProfessorModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    status: 'Ativo',
    vinculo: 'Efetivo',
  });

  useEffect(() => {
    if (professorParaEditar) {
      setFormData({
        nome: professorParaEditar.nome || '',
        email: professorParaEditar.email || '',
        cpf: professorParaEditar.cpf || '',
        telefone: professorParaEditar.telefone || '',
        status: professorParaEditar.status || 'Ativo',
        vinculo: professorParaEditar.vinculo || 'Efetivo',
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        cpf: '',
        telefone: '',
        status: 'Ativo',
        vinculo: 'Efetivo',
      });
    }
  }, [professorParaEditar, isOpen]);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatTelefone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-800">
            {professorParaEditar ? 'Editar Professor' : 'Novo Professor'}
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
              <User className="w-4 h-4 text-slate-400" />
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              placeholder="Ex: João da Silva"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              E-mail
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              placeholder="Ex: joao.silva@escola.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-400" />
                CPF
              </label>
              <input
                type="text"
                required
                maxLength={14}
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                placeholder="000.000.000-00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                Telefone
              </label>
              <input
                type="tel"
                required
                maxLength={15}
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 pb-1">
              <Briefcase className="w-4 h-4 text-slate-400" />
              Vínculo
            </label>
            <select
              required
              value={formData.vinculo}
              onChange={(e) => setFormData({ ...formData, vinculo: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white"
            >
              <option value="Efetivo">Efetivo</option>
              <option value="Temporário">Temporário</option>
              <option value="Substituto">Substituto</option>
            </select>
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
                  name="status_prof"
                  checked={formData.status === 'Ativo'}
                  onChange={() => setFormData({ ...formData, status: 'Ativo' })}
                  className="text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-700">Ativo</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="status_prof"
                  checked={formData.status === 'Inativo'}
                  onChange={() => setFormData({ ...formData, status: 'Inativo' })}
                  className="text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm text-slate-700">Inativo</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-6 pb-2">
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
              {professorParaEditar ? 'Salvar Alterações' : 'Salvar Professor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
