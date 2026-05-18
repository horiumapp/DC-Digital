import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Users, User, GraduationCap } from 'lucide-react';
import TabEscolas from './administracao/TabEscolas';
import TabAlunos from './administracao/TabAlunos';
import TabTurmas from './administracao/TabTurmas';
import TabProfessores from './administracao/TabProfessores';
import TabUsuarios from './administracao/TabUsuarios';

export default function Administracao() {
  const { user } = useAuth();
  const defaultTab = user?.role === 'ADMIN' ? 'escolas' : user?.role === 'GESTOR' ? 'professores' : 'turmas';
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-6">
      <div className="max-w-[1400px] mx-auto p-4 space-y-8">
        {/* Header Section */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Painel Administrativo</h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'ADMIN'
              ? 'Gerencie escolas, turmas, professores, alunos e acessos do sistema.'
              : 'Gerencie turmas, professores e alunos do sistema.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50/50 p-1.5 rounded-xl border border-slate-200">
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('escolas')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition ${activeTab === 'escolas' ? 'bg-white text-[#0f2851] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-[#0f2851] hover:bg-white/50'}`}
            >
              <Building2 className="w-5 h-5" />
              Escolas
            </button>
          )}
          <button
            onClick={() => setActiveTab('turmas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition ${activeTab === 'turmas' ? 'bg-white text-[#0f2851] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-[#0f2851] hover:bg-white/50'}`}
          >
            <Users className="w-5 h-5" />
            Turmas
          </button>
          <button
            onClick={() => setActiveTab('professores')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition ${activeTab === 'professores' ? 'bg-white text-[#0f2851] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-[#0f2851] hover:bg-white/50'}`}
          >
            <GraduationCap className="w-5 h-5" />
            Professores
          </button>
          <button
            onClick={() => setActiveTab('alunos')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition ${activeTab === 'alunos' ? 'bg-white text-[#0f2851] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-[#0f2851] hover:bg-white/50'}`}
          >
            <User className="w-5 h-5" />
            Alunos
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition ${activeTab === 'usuarios' ? 'bg-white text-[#0f2851] shadow-sm border border-slate-100' : 'text-slate-500 hover:text-[#0f2851] hover:bg-white/50'}`}
            >
              <Users className="w-5 h-5" />
              Usuários
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {user?.role === 'ADMIN' && activeTab === 'escolas' && <TabEscolas />}
          {user?.role === 'ADMIN' && activeTab === 'usuarios' && <TabUsuarios />}
          {activeTab === 'alunos' && <TabAlunos />}
          {activeTab === 'turmas' && <TabTurmas />}
          {activeTab === 'professores' && <TabProfessores />}
        </div>
      </div>
    </div>
  );
}
