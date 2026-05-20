import React, { useState, useEffect } from 'react';
import { X, User, Calendar, CreditCard, Users, Phone, MapPin, Activity, Building2, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './common/Toast';
import { validarCPF } from '../utils/cpfUtils';

interface NovoAlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (aluno: any) => void;
  alunoParaEditar?: any;
  fixedEscolaId?: string;
}

export default function NovoAlunoModal({ isOpen, onClose, onSave, alunoParaEditar, fixedEscolaId }: NovoAlunoModalProps) {
  const { showError } = useToast();
  const [escolas, setEscolas] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loadingEscolas, setLoadingEscolas] = useState(false);
  const [loadingTurmas, setLoadingTurmas] = useState(false);

  const [formData, setFormData] = useState({
    escola_id: '',
    turma_id: '',
    nome: '',
    dataNascimento: '',
    cpf: '',
    sexo: '',
    nomeResponsavel: '',
    telefone: '',
    endereco: '',
    status: 'Ativo',
  });

  const fetchEscolas = React.useCallback(async () => {
    setLoadingEscolas(true);
    const { data } = await supabase.from('escolas').select('id, nome').eq('status', 'Ativa').order('nome');
    if (data) setEscolas(data);
    setLoadingEscolas(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchEscolas();
    }
  }, [isOpen, fetchEscolas]);

  const fetchTurmas = React.useCallback(async (escolaId: string) => {
    setLoadingTurmas(true);
    const { data } = await supabase.from('turmas').select('id, nome, turno').eq('escola_id', escolaId).order('nome');
    if (data) setTurmas(data);
    setLoadingTurmas(false);
  }, []);

  useEffect(() => {
    if (formData.escola_id) {
      fetchTurmas(formData.escola_id);
    } else {
      setTurmas([]);
    }
  }, [formData.escola_id, fetchTurmas]);

  useEffect(() => {
    if (alunoParaEditar) {
      setFormData({
        escola_id: alunoParaEditar.escola_id || '',
        turma_id: alunoParaEditar.turma_id || '',
        nome: alunoParaEditar.nome || '',
        dataNascimento: alunoParaEditar.dataNascimento || alunoParaEditar.data_nascimento || '',
        cpf: alunoParaEditar.cpf || '',
        sexo: alunoParaEditar.sexo || '',
        nomeResponsavel: alunoParaEditar.nomeResponsavel || alunoParaEditar.nome_responsavel || '',
        telefone: alunoParaEditar.telefone || '',
        endereco: alunoParaEditar.endereco || '',
        status: alunoParaEditar.status || 'Ativo',
      });
    } else {
      setFormData({
        escola_id: fixedEscolaId || (escolas.length === 1 ? escolas[0].id : ''),
        turma_id: '',
        nome: '',
        dataNascimento: '',
        cpf: '',
        sexo: '',
        nomeResponsavel: '',
        telefone: '',
        endereco: '',
        status: 'Ativo',
      });
    }
  }, [alunoParaEditar, isOpen, escolas, fixedEscolaId]);

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
    // BUG-01 FIX: substituir alert() bloqueante por Toast
    if (!formData.escola_id) {
      showError('Selecione uma Escola antes de continuar.');
      return;
    }
    if (!formData.turma_id) {
      showError('Selecione uma Turma antes de continuar.');
      return;
    }
    // Validar CPF apenas se foi alterado (para não bloquear edição de outros campos com CPF legado)
    const cpfOriginal = alunoParaEditar?.cpf || '';
    const cpfFoiAlterado = formData.cpf !== cpfOriginal;
    if (formData.cpf && cpfFoiAlterado && !validarCPF(formData.cpf)) {
      showError('CPF inválido. Verifique os dígitos e tente novamente.');
      return;
    }
    onSave({
      ...formData,
      data_nascimento: formData.dataNascimento,
      nome_responsavel: formData.nomeResponsavel
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white z-10 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">
            {alunoParaEditar ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <form id="aluno-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Escola a qual pertence
                </label>
                <select
                  required
                  disabled={loadingEscolas}
                  value={formData.escola_id}
                  onChange={(e) => setFormData({ ...formData, escola_id: e.target.value, turma_id: '' })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white font-medium"
                >
                  <option value="" disabled>Selecione a Escola</option>
                  {escolas.map(escola => (
                    <option key={escola.id} value={escola.id}>{escola.nome}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Turma Destinada
                </label>
                <select
                  required
                  disabled={!formData.escola_id || loadingTurmas}
                  value={formData.turma_id}
                  onChange={(e) => setFormData({ ...formData, turma_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white font-medium"
                >
                  <option value="" disabled>Selecione uma Escola antes</option>
                  {turmas.map(turma => (
                    <option key={turma.id} value={turma.id}>{turma.nome} ({turma.turno})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400" />
                Nome Completo do Aluno
              </label>
              <input
                type="text"
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                placeholder="Ex: Ana Maria Santos"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  required
                  value={formData.dataNascimento}
                  onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  CPF <span className="text-xs text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2 pb-1">
                <Users className="w-4 h-4 text-slate-400" />
                Sexo <span className="text-xs text-slate-400 font-normal">(Opcional)</span>
              </label>
              <select
                value={formData.sexo}
                onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all bg-white text-slate-700"
              >
                <option value="">Selecione...</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2 pb-1">
                <Activity className="w-4 h-4 text-slate-400" />
                Status da Matrícula
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status_aluno"
                    checked={formData.status === 'Ativo'}
                    onChange={() => setFormData({ ...formData, status: 'Ativo' })}
                    className="text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-slate-700">Ativo</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status_aluno"
                    checked={formData.status === 'Inativo'}
                    onChange={() => setFormData({ ...formData, status: 'Inativo' })}
                    className="text-blue-600 focus:ring-blue-600"
                  />
                  <span className="text-sm text-slate-700">Inativo</span>
                </label>
              </div>
            </div>

            <div className="space-y-1.5 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Informações de Contato / Filiação</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Nome do Responsável
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nomeResponsavel}
                    onChange={(e) => setFormData({ ...formData, nomeResponsavel: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="Ex: Carlos Silva"
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

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                    placeholder="Rua, Número, Bairro, Cidade"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 sticky bottom-0 z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="aluno-form"
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            {alunoParaEditar ? 'Salvar Alterações' : 'Salvar Aluno'}
          </button>
        </div>
      </div>
    </div>
  );
}
