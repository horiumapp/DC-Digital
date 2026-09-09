// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Diario from '../pages/Diario';

const mockUseTurma = vi.fn();

vi.mock('../contexts/TurmaContext', () => ({
  useTurma: () => mockUseTurma(),
}));

vi.mock('../components/common/TurmaHeaderInfo', () => ({
  default: () => <div data-testid="turma-header" />,
}));

vi.mock('../components/common/CalendarWidget', () => ({
  default: (props: any) => (
    <div data-testid="calendar-widget" data-current-month={props.currentMonth}>
      Calendar Month: {props.currentMonth}
    </div>
  ),
}));

vi.mock('../hooks/useTurmaProgress', () => ({
  useTurmaProgress: () => ({
    pFreq: 100,
    pObj: 100,
    pAvaliacoes: 100,
    pNotas: 100,
    barColor: () => 'bg-emerald-500',
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

const turmaMock = {
  id: 'turma-1',
  ensino: 'Fundamental Anos Iniciais',
  fase: '1º A',
  componente: 'MATEMÁTICA',
  professor: 'Professor Teste',
  escola: 'Escola Teste',
  turno: 'Manhã',
  metricas: { frequencia: 100, objetosMinistrados: 100, objetosPlanejados: 100, avaliacoesCadastradas: 1, avaliacoesPrevistas: 1, notasLancadas: 1, notasPrevistas: 1 },
  diasDeAula: [1, 3],
  tempos: ['1', '2'],
};

describe('Diario - Seleção Automática do Período Letivo Aberto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('seleciona automaticamente o 3º Bimestre quando o 1º e o 2º estiverem fechados', () => {
    const fechamentos = {
      '1. BIMESTRE': true,
      '2. BIMESTRE': true,
      '3. BIMESTRE': false,
    };

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock,
      lancamentos: [],
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos,
      verificarPeriodoFechado: (id: string) => !!fechamentos[id as keyof typeof fechamentos],
    });

    render(<Diario />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('3. BIMESTRE');

    // Como o 3º bimestre está aberto, a mensagem "Aparata Fechada" não deve estar visível
    expect(screen.queryByText('Aparata Fechada')).toBeNull();
    // E o widget do calendário deve estar renderizado
    expect(screen.getByTestId('calendar-widget')).toBeDefined();
  });

  it('mantém o 1º Bimestre se nenhum período estiver fechado (início do ano)', () => {
    const fechamentos = {};

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock,
      lancamentos: [],
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos,
      verificarPeriodoFechado: () => false,
    });

    render(<Diario />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('1. BIMESTRE');
  });

  it('permite que o professor selecione manualmente um bimestre anterior fechado para consulta', () => {
    const fechamentos = {
      '1. BIMESTRE': true,
      '2. BIMESTRE': true,
      '3. BIMESTRE': false,
    };

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock,
      lancamentos: [],
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos,
      verificarPeriodoFechado: (id: string) => !!fechamentos[id as keyof typeof fechamentos],
    });

    const { rerender } = render(<Diario />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('3. BIMESTRE');

    // Professor muda manualmente para o 1º Bimestre para consultar
    fireEvent.change(select, { target: { value: '1. BIMESTRE' } });
    expect(select.value).toBe('1. BIMESTRE');

    // Agora o 1º bimestre deve mostrar que está fechado
    expect(screen.getByText('Aparata Fechada')).toBeDefined();

    // Rerender com a mesma turma não deve reverter a escolha manual do professor
    rerender(<Diario />);
    expect(select.value).toBe('1. BIMESTRE');
  });

  it('redefine a seleção automática para o período aberto ao trocar de turma ativa', () => {
    const fechamentosTurma1 = {
      '1. BIMESTRE': true,
      '2. BIMESTRE': true,
      '3. BIMESTRE': false,
    };

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock,
      lancamentos: [],
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos: fechamentosTurma1,
      verificarPeriodoFechado: (id: string) => !!fechamentosTurma1[id as keyof typeof fechamentosTurma1],
    });

    const { rerender } = render(<Diario />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('3. BIMESTRE');

    // Professor seleciona manualmente 1º Bimestre na Turma 1
    fireEvent.change(select, { target: { value: '1. BIMESTRE' } });
    expect(select.value).toBe('1. BIMESTRE');

    // Troca para a Turma 2 (onde apenas o 1º bimestre está fechado e o 2º está aberto)
    const turmaMock2 = { ...turmaMock, id: 'turma-2', fase: '2º B' };
    const fechamentosTurma2 = {
      '1. BIMESTRE': true,
      '2. BIMESTRE': false,
    };

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock2,
      lancamentos: [],
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos: fechamentosTurma2,
      verificarPeriodoFechado: (id: string) => !!fechamentosTurma2[id as keyof typeof fechamentosTurma2],
    });

    rerender(<Diario />);

    // Na nova turma, a escolha manual anterior deve ser redefinida e posicionar no período aberto da Turma 2 (2º Bimestre)
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('2. BIMESTRE');
  });
});
