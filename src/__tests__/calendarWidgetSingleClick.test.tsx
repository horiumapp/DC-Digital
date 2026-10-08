// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CalendarWidget from '../components/common/CalendarWidget';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

describe('CalendarWidget - Abertura do Diário com apenas um clique', () => {
  const mockOnDaySelect = vi.fn();
  const mockOnMonthChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const turmaAtivaExemplo = {
    id: 'turma-1',
    nome: '1º ANO A',
  };

  // Segunda-feira (dia 1)
  const horarioTurma = [
    { dia_semana: 1, tempo_ordem: 1, componente: 'MATEMÁTICA' },
  ];

  it('deve navegar diretamente para a tela de frequência e notas ao clicar UMA ÚNICA VEZ em um dia de aula', () => {
    render(
      <CalendarWidget
        year={2026}
        currentMonth={4} // Maio 2026 (Maio 4, 2026 é Segunda-feira)
        onMonthChange={mockOnMonthChange}
        turmaAtiva={turmaAtivaExemplo}
        lancamentos={[]}
        avaliacoes={[]}
        alunos={[]}
        horarioTurma={horarioTurma}
        periodoStart="2026-05-01"
        periodoEnd="2026-05-31"
        selectedDay={null}
        onDaySelect={mockOnDaySelect}
      />
    );

    // O dia 4 de maio de 2026 é uma segunda-feira letiva
    const botaoDia4 = screen.getByLabelText(/4 de Maio, Segunda-feira/i);
    expect(botaoDia4).toBeDefined();

    // Dispara UM ÚNICO clique
    fireEvent.click(botaoDia4);

    // onDaySelect deve ser invocado
    expect(mockOnDaySelect).toHaveBeenCalledTimes(1);

    // navigate deve ser chamado imediatamente para /frequencia com a data e turma corretas
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/frequencia?date=2026-05-04&turmaId=turma-1');
  });

  it('deve exibir o tooltip indicando clique único para abrir frequência e notas', () => {
    render(
      <CalendarWidget
        year={2026}
        currentMonth={4}
        onMonthChange={mockOnMonthChange}
        turmaAtiva={turmaAtivaExemplo}
        lancamentos={[]}
        avaliacoes={[]}
        alunos={[]}
        horarioTurma={horarioTurma}
        periodoStart="2026-05-01"
        periodoEnd="2026-05-31"
        selectedDay={null}
        onDaySelect={mockOnDaySelect}
      />
    );

    const cell = screen.getByLabelText(/4 de Maio, Segunda-feira/i);
    expect(cell.getAttribute('title')).toBe('Clique para abrir Frequência e notas');
    expect(cell.getAttribute('title')).not.toContain('duas vezes');
  });

  it('deve abrir o diário ao pressionar Enter em um dia de aula', () => {
    render(
      <CalendarWidget
        year={2026}
        currentMonth={4}
        onMonthChange={mockOnMonthChange}
        turmaAtiva={turmaAtivaExemplo}
        lancamentos={[]}
        avaliacoes={[]}
        alunos={[]}
        horarioTurma={horarioTurma}
        periodoStart="2026-05-01"
        periodoEnd="2026-05-31"
        selectedDay={null}
        onDaySelect={mockOnDaySelect}
      />
    );

    const botaoDia4 = screen.getByLabelText(/4 de Maio, Segunda-feira/i);
    fireEvent.keyDown(botaoDia4, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/frequencia?date=2026-05-04&turmaId=turma-1');
  });
});
