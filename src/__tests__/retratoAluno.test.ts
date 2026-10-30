import { describe, expect, it } from 'vitest';
import { retratoPorSexo } from '../utils/retratoAluno';

describe('retratoPorSexo', () => {
  it('escolhe o retrato masculino', () => {
    expect(retratoPorSexo('Masculino')).toBe('/aluno-masculino.jpg');
    expect(retratoPorSexo('M')).toBe('/aluno-masculino.jpg');
  });

  it('escolhe o retrato feminino', () => {
    expect(retratoPorSexo('Feminino')).toBe('/aluna-feminino.jpg');
    expect(retratoPorSexo('F')).toBe('/aluna-feminino.jpg');
  });

  it('não atribui retrato quando o sexo não está informado', () => {
    expect(retratoPorSexo('')).toBeNull();
    expect(retratoPorSexo('Outro')).toBeNull();
    expect(retratoPorSexo('Prefiro não informar')).toBeNull();
    expect(retratoPorSexo(null)).toBeNull();
  });
});
