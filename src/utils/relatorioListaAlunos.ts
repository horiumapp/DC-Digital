export interface TurmaListaAlunos {
  id: string;
  nome: string;
  turno: string;
  ensino: string;
  fase: string;
  escolaId: string;
  escolaNome: string;
}

/** Remove duplicatas geradas por componentes em fetchTurmasRelatorio. */
export function deduplicarTurmasRelatorio(
  turmas: Array<{
    id: string;
    nome: string;
    turno: string;
    ensino: string;
    fase: string;
    escolaId: string;
    escolaNome: string;
  }>
): TurmaListaAlunos[] {
  const mapa = new Map<string, TurmaListaAlunos>();
  turmas.forEach((t) => {
    if (!mapa.has(t.id)) {
      mapa.set(t.id, {
        id: t.id,
        nome: t.nome,
        turno: t.turno || '',
        ensino: t.ensino || '',
        fase: t.fase || t.nome,
        escolaId: t.escolaId,
        escolaNome: t.escolaNome || 'Escola',
      });
    }
  });
  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Filtra turmas pelo turno escolhido (vazio = todos). */
export function filtrarTurmasPorTurno(turmas: TurmaListaAlunos[], turno: string): TurmaListaAlunos[] {
  if (!turno) return turmas;
  return turmas.filter(
    (t) => (t.turno || '').toLocaleLowerCase('pt-BR') === turno.toLocaleLowerCase('pt-BR')
  );
}

/** Garante que a turma consultada está na lista autorizada do usuário. */
export function turmaPermitida(turmas: TurmaListaAlunos[], turmaId: string): TurmaListaAlunos | undefined {
  if (!turmaId) return undefined;
  return turmas.find((t) => t.id === turmaId);
}
