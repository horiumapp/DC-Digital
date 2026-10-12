import { describe, expect, it } from 'vitest';
import { professorPodeAbrirTurma, resolverLotacaoInicial } from '../utils/lotacaoProfessor';

const manha = { id: '1', escola_id: 'escola-a', turno: 'Manhã' };
const tarde = { id: '2', escola_id: 'escola-b', turno: 'Tarde' };

describe('resolverLotacaoInicial', () => {
  it('entra direto quando há uma lotação', () => {
    expect(resolverLotacaoInicial([manha], null, null, null)).toEqual({ ativa: manha, pedirEscolha: false });
  });

  it('pede a escola quando há duas lotações e a sessão ainda não foi confirmada', () => {
    expect(resolverLotacaoInicial([manha, tarde], null, 'escola-a', 'Manhã')).toEqual({
      ativa: null,
      pedirEscolha: true,
    });
  });

  it('restaura a lotação confirmada nesta sessão', () => {
    expect(resolverLotacaoInicial([manha, tarde], 'escola-b|Tarde', 'escola-b', 'Tarde')).toEqual({
      ativa: tarde,
      pedirEscolha: false,
    });
  });

  it('pede de novo se a lotação confirmada não existe mais', () => {
    expect(resolverLotacaoInicial([manha], 'escola-b|Tarde', 'escola-b', 'Tarde').ativa).toEqual(manha);
    expect(resolverLotacaoInicial([manha, tarde], 'escola-c|Noite', 'escola-c', 'Noite').pedirEscolha).toBe(true);
  });
});

describe('professorPodeAbrirTurma', () => {
  const professor = { role: 'PROFESSOR', escola_id: 'escola-a', alocacoes: [manha, tarde] };

  it('permite a segunda escola quando ela está nas lotações', () => {
    expect(professorPodeAbrirTurma(professor, 'escola-b')).toBe(true);
  });

  it('mantém o bloqueio de uma escola fora das lotações', () => {
    expect(professorPodeAbrirTurma(professor, 'escola-c')).toBe(false);
  });

  it('mantém o gestor limitado à escola da conta', () => {
    expect(professorPodeAbrirTurma({ role: 'GESTOR', escola_id: 'escola-a' }, 'escola-b')).toBe(false);
  });
});
