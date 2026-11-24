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

/**
 * Escola de trabalho do relatório — alinhada ao cabeçalho do portal:
 * lotação ativa do professor → turma aberta → escola do usuário.
 */
export function escolaTrabalhoRelatorio(
  user?: { role?: string; escolaAtivaId?: string; escola_id?: string } | null,
  turmaAtiva?: { escola_id?: string } | null,
): string | undefined {
  if (user?.role === 'PROFESSOR' && user.escolaAtivaId) {
    return user.escolaAtivaId;
  }
  return turmaAtiva?.escola_id || user?.escolaAtivaId || user?.escola_id || undefined;
}

/**
 * Restringe turmas à escola (e turno, se houver) da lotação ativa.
 * Evita pré-selecionar turma de outra escola quando o professor tem várias lotações.
 */
export function filtrarTurmasRelatorioEscolaAtiva<T extends { escolaId?: string; turno?: string }>(
  turmas: T[],
  escolaId?: string | null,
  turno?: string | null,
): T[] {
  if (!escolaId || turmas.length === 0) return turmas;

  const porEscola = turmas.filter(t => t.escolaId === escolaId);
  if (porEscola.length === 0) return [];

  const turnoNorm = (turno || '').trim().toLowerCase();
  if (!turnoNorm) return porEscola;

  const porTurno = porEscola.filter(t => (t.turno || '').trim().toLowerCase() === turnoNorm);
  return porTurno.length > 0 ? porTurno : porEscola;
}

export function escolherTurmaRelatorio<T extends { id: string; componente?: string; escolaId?: string }>(
  turmas: T[],
  ativa?: { id: string | number; componente?: string; escola_id?: string } | null,
  escolaAtivaId?: string | null,
): string {
  if (turmas.length === 0) return '';

  const escolaAlvo = (ativa?.escola_id || escolaAtivaId || '').trim();
  const candidatas = escolaAlvo
    ? turmas.filter(t => !t.escolaId || t.escolaId === escolaAlvo)
    : turmas;
  const lista = candidatas.length > 0 ? candidatas : turmas;

  if (ativa) {
    const id = String(ativa.id).split('||')[0];
    const comp = (ativa.componente || '').trim().toLowerCase();
    const porIdEComp = lista.find(
      t => String(t.id).split('||')[0] === id && (t.componente || '').trim().toLowerCase() === comp,
    );
    const porId = lista.find(t => String(t.id).split('||')[0] === id);
    const escolhida = (comp && porIdEComp) || porId;
    if (escolhida) return chaveTurmaRelatorio(escolhida.id, escolhida.componente);
  }

  return chaveTurmaRelatorio(lista[0].id, lista[0].componente);
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
