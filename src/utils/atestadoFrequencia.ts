export interface ChamadaAluno {
  id: string;
  freq: string;
  atestado?: boolean;
}

/** O atestado da secretaria trava a chamada em FJ. Justificativa antiga do professor volta a ser falta. */
export function aplicarAtestadoNaChamada<T extends ChamadaAluno>(
  aluno: T,
  alunosComAtestado: ReadonlySet<string>
): T & { atestado: boolean } {
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

function statusNormalizado(status: string | null | undefined): string {
  return (status || '').trim().toUpperCase();
}

/** Falta, falta justificada e atestado impedem nota na prova daquele dia. */
export function statusAusenteNaProva(status: string | null | undefined): boolean {
  const valor = statusNormalizado(status);
  return valor === 'F' || valor === 'AUSENTE' || valor === 'FJ' || valor === 'JUSTIFICADA';
}

export function statusCobertoPorAtestado(status: string | null | undefined): boolean {
  const valor = statusNormalizado(status);
  return valor === 'FJ' || valor === 'JUSTIFICADA';
}

export function separarAusenciasDaProva(
  registros: { aluno_id: string | number; status: string }[],
  cobertosPorAtestado: ReadonlySet<string>
): { ausentes: Set<string>; atestados: Set<string> } {
  const ausentes = new Set<string>();
  const atestados = new Set<string>();
  cobertosPorAtestado.forEach(id => {
    ausentes.add(String(id));
    atestados.add(String(id));
  });
  registros.forEach(registro => {
    const id = String(registro.aluno_id);
    if (statusAusenteNaProva(registro.status)) ausentes.add(id);
    if (statusCobertoPorAtestado(registro.status)) atestados.add(id);
  });
  return { ausentes, atestados };
}
