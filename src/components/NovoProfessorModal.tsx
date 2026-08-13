import React, { useState, useEffect } from 'react';
import { X, User, Mail, CreditCard, Phone, Activity, Briefcase, GraduationCap, LayoutGrid, KeyRound, Plus } from 'lucide-react';

interface NovoProfessorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (professor: any) => void;
  professorParaEditar?: any;
}

const DEPARTAMENTOS = ['Geral', 'BIOLÓGICAS', 'HUMANAS', 'EXATAS', 'LINGUAGENS'];
const DISCIPLINAS = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Artes', 'Educação Física', 'Inglês', 'Ensino Religioso'
];

const NovoProfessorModal = React.memo(function NovoProfessorModal({ isOpen, onClose, onSave, professorParaEditar }: NovoProfessorModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    senha: '',
    status: 'Ativo',
    vinculo: 'Efetivo',
    departamento: 'Geral',
    disciplinas: [] as string[]
  });

  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [showNovaDisciplina, setShowNovaDisciplina] = useState(false);

  const handleAddCustomDisciplina = () => {
    if (novaDisciplina.trim() && !formData.disciplinas.includes(novaDisciplina.trim())) {
      setFormData(prev => ({
        ...prev,
        disciplinas: [...prev.disciplinas, novaDisciplina.trim()]
      }));
      setNovaDisciplina('');
      setShowNovaDisciplina(false);
    }
  };

   
  useEffect(() => {
    if (professorParaEditar) {
      setFormData({
        nome: professorParaEditar.nome || '',
        email: professorParaEditar.email || '',
        cpf: professorParaEditar.cpf || '',
        telefone: professorParaEditar.telefone || '',
        senha: '',
        status: professorParaEditar.status || 'Ativo',
        vinculo: professorParaEditar.vinculo || 'Efetivo',
        departamento: professorParaEditar.departamento || 'Geral',
        disciplinas: professorParaEditar.disciplinas || []
      });
    } else {
      setFormData({
        nome: '',
        email: '',
        cpf: '',
        telefone: '',
        senha: '',
        status: 'Ativo',
        vinculo: 'Efetivo',
        departamento: 'Geral',
        disciplinas: []
      });
    }
  }, [professorParaEditar, isOpen]);
   

  const toggleDisciplina = (disc: string) => {
    setFormData(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.includes(disc)
        ? prev.disciplinas.filter(d => d !== disc)
        : [...prev.disciplinas, disc]
    }));
  };

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10">
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
          <form id="professor-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder-slate-400 font-medium"
                  placeholder="Ex: João da Silva"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder-slate-400 font-medium"
                  placeholder="Ex: joao.silva@escola.com"
                />
              </div>

              {/* CPF */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  CPF
                </label>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder-slate-400 font-medium"
                  placeholder="000.000.000-00"
                />
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  Telefone
                </label>
                <input
                  type="tel"
                  required
                  maxLength={15}
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatTelefone(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder-slate-400 font-medium"
                  placeholder="(00) 00000-0000"
                />
              </div>

              {/* Senha de Acesso (só no cadastro novo) */}
              {!professorParaEditar && (
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-slate-400" />
                    Senha de Acesso
                  </label>
                  <input
                    type="password"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    autoComplete="new-password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all placeholder-slate-400 font-medium"
                    placeholder="Mín. 8 caracteres (letras e números)"
                  />
                  <p className="text-[10px] text-slate-400 font-medium ml-1">
                    Defina uma senha para que o professor possa acessar o sistema. Se deixar vazio, será gerada uma senha temporária segura exibida após o cadastro.
                  </p>
                </div>
              )}

              {/* Vínculo */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  Vínculo
                </label>
                <select
                  required
                  value={formData.vinculo}
                  onChange={(e) => setFormData({ ...formData, vinculo: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all bg-white font-medium"
                >
                  <option value="Efetivo">Efetivo</option>
                  <option value="Temporário">Temporário</option>
                  <option value="Substituto">Substituto</option>
                </select>
              </div>

              {/* Departamento */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-slate-400" />
                  Departamento / Área
                </label>
                <select
                  required
                  value={formData.departamento}
                  onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 transition-all bg-white font-medium"
                >
                  {DEPARTAMENTOS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                Status
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="status_prof"
                    checked={formData.status === 'Ativo'}
                    onChange={() => setFormData({ ...formData, status: 'Ativo' })}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="radio"
                    name="status_prof"
                    checked={formData.status === 'Inativo'}
                    onChange={() => setFormData({ ...formData, status: 'Inativo' })}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">Inativo</span>
                </label>
              </div>
            </div>

            {/* Disciplinas */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-slate-400" />
                Disciplinas que este professor ministra
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {Array.from(new Set([...DISCIPLINAS, ...formData.disciplinas])).map(disc => {
                  const isSelected = formData.disciplinas.includes(disc);
                  return (
                    <button
                      key={disc}
                      type="button"
                      onClick={() => toggleDisciplina(disc)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all border ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500'
                      }`}
                    >
                      {disc}
                    </button>
                  );
                })}
                
                {showNovaDisciplina ? (
                  <div className="flex items-center gap-1 ml-1">
                    <input 
                      type="text" 
                      value={novaDisciplina}
                      onChange={(e) => setNovaDisciplina(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDisciplina(); } }}
                      placeholder="Nova disciplina..."
                      className="px-3 py-1.5 w-36 rounded-full text-[10px] font-bold border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                      autoFocus
                    />
                    <button onClick={handleAddCustomDisciplina} type="button" className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => { setShowNovaDisciplina(false); setNovaDisciplina(''); }} type="button" className="p-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNovaDisciplina(true)}
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider transition-all border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 bg-slate-50 hover:bg-blue-50"
                  >
                    <Plus className="w-3 h-3" />
                    Adicionar
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="professor-form"
            className="px-8 py-2.5 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-600/20 active:scale-95"
          >
            {professorParaEditar ? 'Salvar Alterações' : 'Salvar Professor'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default NovoProfessorModal;
