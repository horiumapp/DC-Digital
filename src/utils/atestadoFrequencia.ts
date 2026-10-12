export interface ChamadaAluno {
  id: string;
  freq: string;
  atestado?: boolean;
}

/** O atestado da secretaria trava a chamada em FJ. Justificativa antiga do professor volta a ser falta. */
export function aplicarAtestadoNaChamada<T extends ChamadaAluno>(
  aluno: T,
  alunosComAtestado: ReadonlySet<string>
): T {
  if (alunosComAtestado.has(aluno.id)) {
    return { ...aluno, atestado: true, freq: 'FJ' };
  }
  return {
    ...aluno,
    atestado: false,
    freq: aluno.freq === 'FJ' ? 'F' : aluno.freq,
  };
}

export function dataCobertaPeloAtestado(dataIso: string, inicio: string, fim: string): boolean {
  return dataIso >= inicio && dataIso <= fim;
}
