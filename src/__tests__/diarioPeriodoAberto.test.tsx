// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import Diario from '../pages/Diario';

const mockUseTurma = vi.fn();

vi.mock('../contexts/TurmaContext', () => ({
  useTurma: () => mockUseTurma(),
}));

vi.mock('../contexts/OfflineContext', () => ({
  useOffline: () => ({
    isOnline: true,
    connectionState: 'ONLINE',
    pendingCount: 0,
  }),
}));

vi.mock('../components/common/TurmaHeaderInfo', () => ({
  default: () => <div data-testid="turma-header" />,
}));

let mockSearchParams = new URLSearchParams();

vi.mock('../components/common/CalendarWidget', () => ({
  default: (props: { currentMonth?: number; selectedDay?: number | null }) => (
    <div 
      data-testid="calendar-widget" 
      data-current-month={props.currentMonth}
      data-selected-day={props.selectedDay ?? ''}
    >
      Calendar Month: {props.currentMonth}, Day: {props.selectedDay}
    </div>
  ),
}));

vi.mock('../hooks/useTurmaProgress', () => ({
  useTurmaProgress: () => ({
    pFreq: 100,
    pObj: 100,
    pAvaliacoes: 100,
    pNotas: 100,
    freqLancadas: 56,
    conteudoLancados: 56,
    totalEsperado: 56,
    barColor: () => 'bg-emerald-500',
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearchParams: () => [mockSearchParams, vi.fn()],
}));

vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
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
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 13, 12, 0, 0));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('abre o bimestre de hoje mesmo quando o anterior ainda está aberto', () => {
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
    expect(select.value).toBe('4. BIMESTRE');
    expect(Array.from(select.options).map((option) => option.value)).toContain('3. BIMESTRE');

    expect(screen.queryByText('Aparata Fechada')).toBeNull();
    // E o widget do calendário deve estar renderizado
    expect(screen.getByTestId('calendar-widget')).toBeDefined();
  });

  it('abre o bimestre da data de hoje se nenhum período estiver fechado', () => {
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
    expect(select.value).toBe('4. BIMESTRE');
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
    expect(select.value).toBe('4. BIMESTRE');

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
    expect(select.value).toBe('4. BIMESTRE');

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

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('4. BIMESTRE');
  });

  it('posiciona automaticamente no mês e dia especificados em ?date=YYYY-MM-DD da URL', () => {
    mockSearchParams = new URLSearchParams('date=2026-03-18');

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock,
      lancamentos: [],
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos: {},
      verificarPeriodoFechado: () => false,
    });

    render(<Diario />);

    const widget = screen.getByTestId('calendar-widget');
    // Março é o índice 2 (0-indexed)
    expect(widget.getAttribute('data-current-month')).toBe('2');
    expect(widget.getAttribute('data-selected-day')).toBe('18');

    mockSearchParams = new URLSearchParams();
  });

  it('posiciona no último preenchimento quando ele está no bimestre de hoje', () => {
    mockSearchParams = new URLSearchParams();

    const lancamentosMock = [
      { turmaId: 'turma-1', data: '2026-09-28', tipo: 'frequencia', tempo: '1º TEMPO' },
      { turmaId: 'turma-1', data: '2026-10-02', tipo: 'conteudo', tempo: '3º TEMPO' },
    ];

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock,
      lancamentos: lancamentosMock,
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos: {},
      verificarPeriodoFechado: () => false,
    });

    render(<Diario />);

    const widget = screen.getByTestId('calendar-widget');
    expect(widget.getAttribute('data-current-month')).toBe('9');
    expect(widget.getAttribute('data-selected-day')).toBe('2');
  });

  it('abre o mês de hoje quando o último preenchimento ficou em um bimestre anterior', () => {
    mockSearchParams = new URLSearchParams();

    mockUseTurma.mockReturnValue({
      turmaAtiva: turmaMock,
      lancamentos: [
        { turmaId: 'turma-1', data: '2026-03-18', tipo: 'conteudo', tempo: '3º TEMPO' },
      ],
      avaliacoes: [],
      alunos: [],
      horarioTurma: [],
      fechamentos: {},
      verificarPeriodoFechado: () => false,
    });

    render(<Diario />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const widget = screen.getByTestId('calendar-widget');
    expect(select.value).toBe('4. BIMESTRE');
    expect(widget.getAttribute('data-current-month')).toBe('9');
  });
});
