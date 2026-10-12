export const CHAVE_LOTACAO_CONFIRMADA = 'lotacaoConfirmada';

export interface LotacaoResumo {
  escola_id: string;
  turno: string;
}

export function marcaLotacao(escolaId: string, turno: string): string {
  return `${escolaId}|${turno}`;
}

/** Uma lotação entra direto. Duas ou mais só entram com a escolha já confirmada nesta sessão. */
export function resolverLotacaoInicial<T extends LotacaoResumo>(
  alocacoes: T[],
  confirmada: string | null,
  escolaId: string | null,
  turno: string | null,
): { ativa: T | null; pedirEscolha: boolean } {
  if (alocacoes.length === 0) return { ativa: null, pedirEscolha: false };
  if (alocacoes.length === 1) return { ativa: alocacoes[0], pedirEscolha: false };

  const marca = escolaId && turno ? marcaLotacao(escolaId, turno) : null;
  if (confirmada && marca && confirmada === marca) {
    const encontrada = alocacoes.find(item => item.escola_id === escolaId && item.turno === turno);
    if (encontrada) return { ativa: encontrada, pedirEscolha: false };
  }

  return { ativa: null, pedirEscolha: true };
}

export function lotacaoConfirmadaNaSessao(): { escolaId: string; turno: string } | null {
  if (typeof sessionStorage === 'undefined') return null;
  const confirmada = sessionStorage.getItem(CHAVE_LOTACAO_CONFIRMADA);
  const escolaId = sessionStorage.getItem('activeEscolaId');
  const turno = sessionStorage.getItem('activeTurno');
  if (!confirmada || !escolaId || !turno) return null;
  if (confirmada !== marcaLotacao(escolaId, turno)) return null;
  return { escolaId, turno };
}

export function professorPodeAbrirTurma(
  user: { role: string; escola_id?: string; alocacoes?: { escola_id: string }[] } | null,
  turmaEscolaId?: string,
): boolean {
  if (!user || user.role === 'ADMIN') return true;
  if (!user.escola_id || !turmaEscolaId) return true;
  if (user.role === 'PROFESSOR' && user.alocacoes?.some(item => item.escola_id === turmaEscolaId)) return true;
  return user.escola_id === turmaEscolaId;
}
