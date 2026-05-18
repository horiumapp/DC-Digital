import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Shield, User, GraduationCap, Briefcase, Key, Users, Building2, Mail } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

export default function TabUsuarios() {
  const { user } = useAuth();
  const { showError } = useToast();
  
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('TODOS');
  
  const CARGOS = ['TODOS', 'ADMIN', 'GESTOR', 'SECRETARIO', 'PROFESSOR', 'ALUNO'];

  useEffect(() => {
    fetchData();
  }, []);
  
  async function fetchData() {
    setLoading(true);
    try {
      const { data: escData } = await supabase.from('escolas').select('id, nome');
      if (escData) setEscolas(escData);
      
      const { data: usuData, error: usuError } = await supabase
        .from('usuarios')
        .select('*')
        .order('criado_em', { ascending: false });
        
      if (usuError) throw usuError;
      
      if (usuData) setUsuarios(usuData);
    } catch (err: any) {
      console.error(err);
      showError('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }
  
  const usuariosFiltrados = usuarios.filter(u => {
    const searchString = `${u.nome_completo || ''} ${u.email || ''}`.toLowerCase();
    const matchBusca = searchString.includes(busca.toLowerCase());
    const matchCargo = filtroCargo === 'TODOS' || u.cargo === filtroCargo;
    return matchBusca && matchCargo;
  });

  const getEscolaNome = (escolaId: string) => {
    const esc = escolas.find(e => e.id === escolaId);
    return esc ? esc.nome : '-';
  };

  const getCargoConfig = (cargo: string) => {
    switch (cargo) {
      case 'ADMIN': return { icon: <Shield className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'GESTOR': return { icon: <Briefcase className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'SECRETARIO': return { icon: <Key className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'PROFESSOR': return { icon: <GraduationCap className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'ALUNO': return { icon: <User className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700 border-slate-200' };
      default: return { icon: <User className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Header */}
      <div className="p-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 gap-4 bg-white shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0f2851]" />
            Usuários de Acesso
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Gerencie e visualize as contas de acesso ao sistema agrupadas por perfil.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {CARGOS.map(cargo => (
              <button
                key={cargo}
                onClick={() => setFiltroCargo(cargo)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  filtroCargo === cargo 
                    ? 'bg-white text-[#0f2851] shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {cargo}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-slate-50/50 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0f2851]"></div>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
            <Users className="w-12 h-12 text-slate-200" />
            <p className="font-medium">Nenhum usuário encontrado com este filtro.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Contato / E-mail</th>
                    <th className="px-6 py-4">Perfil</th>
                    <th className="px-6 py-4">Escola Vinculada</th>
                    <th className="px-6 py-4">Data de Criação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosFiltrados.map((u) => {
                    const config = getCargoConfig(u.cargo);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs ${config.color}`}>
                              {u.nome_completo ? u.nome_completo.substring(0, 2).toUpperCase() : 'US'}
                            </div>
                            <span className="font-bold text-slate-800 text-sm">{u.nome_completo || 'Sem nome'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {u.email || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black border ${config.color}`}>
                            {config.icon}
                            {u.cargo}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="truncate max-w-[200px]" title={getEscolaNome(u.escola_id)}>
                              {getEscolaNome(u.escola_id)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-500 font-medium tabular-nums">
                            {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
