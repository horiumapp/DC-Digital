import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TurmaMetricas {
  frequencia: number; // Porcentagem (0 a 100)
  objetosMinistrados: number;
  objetosPlanejados: number;
  avaliacoesCadastradas: number;
  avaliacoesPrevistas: number;
  notasLancadas: number;
  notasPrevistas: number;
}

export interface Turma {
  id: number;
  ensino: string;
  fase: string;
  componente: string;
  professor: string;
  escola: string;
  turno: string;
  metricas: TurmaMetricas;
  diasDeAula: number[]; // 0 = Dom, 1 = Seg, 2 = Ter, 3 = Qua, 4 = Qui, 5 = Sex, 6 = Sáb
  tempos: string[]; // Ex: ['1º TEMPO', '3º TEMPO']
}

export interface Lancamento {
  turmaId: number;
  data: string; // Formato DD/MM/YYYY
  tipo: 'frequencia' | 'conteudo';
  tempo: string;
}

export interface Aluno {
  id: string;
  nome: string;
  freq: string;
  part: string;
}

export interface Avaliacao {
  id: string;
  turmaId: number;
  tipo: string;
  data: string;
  instrumento: string;
  objetos: any[];
}

interface TurmaContextType {
  turmaAtiva: Turma | null;
  selecionarTurma: (turma: Turma) => void;
  lancamentos: Lancamento[];
  registrarLancamento: (lancamento: Lancamento) => void;
  removerLancamento: (lancamento: Omit<Lancamento, 'turmaId'> & { turmaId: number }) => void;
  alunos: Aluno[];
  avaliacoes: Avaliacao[];
  salvarAvaliacao: (av: Avaliacao) => void;
  removerAvaliacao: (id: string) => void;
}

const TurmaContext = createContext<TurmaContextType | undefined>(undefined);

const alunosMockados: Aluno[] = [
  { id: '01', nome: 'Adeilson Soares Dos Santos', freq: 'P', part: 'Presencial' },
  { id: '02', nome: 'Alcemir Silva Barros', freq: 'P', part: 'Presencial' },
  { id: '03', nome: 'Aline Dos Santos Lopes', freq: 'P', part: 'Presencial' },
  { id: '04', nome: 'Ana Lia Viana Cordovil', freq: 'P', part: 'Presencial' },
  { id: '07', nome: 'Antonia Raquel Lima Da Silva', freq: 'P', part: 'Presencial' },
  { id: '08', nome: 'Antonio Elison Oliveira Montei', freq: 'P', part: 'Presencial' },
  { id: '09', nome: 'Emily Souza Da Silva', freq: 'P', part: 'Presencial' },
  { id: '10', nome: 'Iago Moreira Sena', freq: 'P', part: 'Presencial' },
  { id: '30', nome: 'Raimundo Deividy De Souza Alme', freq: 'P', part: 'Presencial' },
  { id: '31', nome: 'Riquelme Melo De Oliveira', freq: 'P', part: 'Presencial' },
  { id: '32', nome: 'Stefany Galdino Da Silva', freq: 'P', part: 'Presencial' },
  { id: '33', nome: 'Taisson Mesquita De Lima', freq: 'P', part: 'Presencial' },
  { id: '34', nome: 'Tiago Mendes Do Nascimento', freq: 'P', part: 'Presencial' },
  { id: '35', nome: 'Valdy Filho Gomes De Oliveira', freq: 'P', part: 'Presencial' },
  { id: '36', nome: 'Vitoria Aparecida Vieira Da Si', freq: 'P', part: 'Presencial' },
  { id: '37', nome: 'Wesley Cardoso Da Silva', freq: 'P', part: 'Presencial' },
  { id: '38', nome: 'Ylanna Gomes Winhork', freq: 'P', part: 'Presencial' },
].sort((a, b) => a.nome.localeCompare(b.nome));

export function TurmaProvider({ children }: { children: ReactNode }) {
  const [turmaAtiva, setTurmaAtiva] = useState<Turma | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [alunos] = useState<Aluno[]>(alunosMockados);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);

  const selecionarTurma = (turma: Turma) => {
    setTurmaAtiva(turma);
  };

  const registrarLancamento = (novo: Lancamento) => {
    setLancamentos(prev => {
      const existe = prev.some(l => 
        l.turmaId === novo.turmaId && 
        l.data === novo.data && 
        l.tipo === novo.tipo && 
        l.tempo === novo.tempo
      );
      if (existe) return prev;
      return [...prev, novo];
    });
  };

  const removerLancamento = (filtro: Lancamento) => {
    setLancamentos(prev => prev.filter(l => 
      !(l.turmaId === filtro.turmaId && 
        l.data === filtro.data && 
        l.tipo === filtro.tipo && 
        l.tempo === filtro.tempo)
    ));
  };

  const salvarAvaliacao = (av: Avaliacao) => {
    setAvaliacoes(prev => {
      const existe = prev.some(a => a.id === av.id);
      if (existe) return prev.map(a => a.id === av.id ? av : a);
      return [...prev, av];
    });
  };

  const removerAvaliacao = (id: string) => {
    setAvaliacoes(prev => prev.filter(a => a.id !== id));
  };

  return (
    <TurmaContext.Provider value={{ 
      turmaAtiva, selecionarTurma, 
      lancamentos, registrarLancamento, removerLancamento,
      alunos, avaliacoes, salvarAvaliacao, removerAvaliacao 
    }}>
      {children}
    </TurmaContext.Provider>
  );
}

export function useTurma() {
  const context = useContext(TurmaContext);
  if (context === undefined) {
    throw new Error('useTurma deve ser usado dentro de um TurmaProvider');
  }
  return context;
}
