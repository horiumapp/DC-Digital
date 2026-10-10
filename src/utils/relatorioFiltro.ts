import { APP_CONFIG, getBimestreAtual } from '../config/appConfig';
import { getBimestreNumero } from './dateUtils';

export const MESES_RELATORIO = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
] as const;

export function labelBimestreAtual(): string {
  return getBimestreAtual()?.label || '4. BIMESTRE';
}

export function mesAtualRelatorio(): string {
  return MESES_RELATORIO[new Date().getMonth()];
}

export function chaveTurmaRelatorio(id: string, componente?: string): string {
  return `${id}|${componente || ''}`;
}

export function escolherTurmaRelatorio<T extends { id: string; componente?: string }>(
  turmas: T[],
  ativa?: { id: string | number; componente?: string } | null,
): string {
  if (turmas.length === 0) return '';
  if (ativa) {
    const id = String(ativa.id).split('||')[0];
    const comp = (ativa.componente || '').trim().toLowerCase();
    const porIdEComp = turmas.find(t => String(t.id).split('||')[0] === id && (t.componente || '').trim().toLowerCase() === comp);
    const porId = turmas.find(t => String(t.id).split('||')[0] === id);
    const escolhida = (comp && porIdEComp) || porId;
    if (escolhida) return chaveTurmaRelatorio(escolhida.id, escolhida.componente);
  }
  return chaveTurmaRelatorio(turmas[0].id, turmas[0].componente);
}

/** O mesmo bimestre vale com os dois textos usados no sistema: "4. BIMESTRE" e "4º Bimestre". */
export function avaliacaoNoPeriodo(bimestreAval: string | undefined, periodo: string): boolean {
  if (!bimestreAval || !periodo) return false;
  if (bimestreAval === periodo) return true;
  const oficial = APP_CONFIG.PERIODOS.find(p => p.label === periodo || p.nome === periodo || p.id === periodo);
  if (oficial && (bimestreAval === oficial.label || bimestreAval === oficial.nome || bimestreAval === oficial.id)) return true;
  const alvo = getBimestreNumero(periodo);
  const atual = getBimestreNumero(bimestreAval);
  return alvo !== null && atual === alvo;
}
