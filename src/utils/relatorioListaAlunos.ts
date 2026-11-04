export interface TurmaListaAlunos {
  id: string;
  nome: string;
  turno: string;
  ensino: string;
  fase: string;
  numero: string;
  escolaId: string;
  escolaNome: string;
}

export interface EscolaListaAlunosInfo {
  id: string;
  nome: string;
  inep?: string;
  distrito?: string;
  logo_url?: string | null;
}

export interface AlunoListaRelatorio {
  id: string;
  nome: string;
  matricula?: string | null;
  data_nascimento?: string | null;
  status?: string | null;
}

/** Remove duplicatas geradas por componentes em fetchTurmasRelatorio. */
export function deduplicarTurmasRelatorio(
  turmas: Array<{
    id: string;
    nome: string;
    turno: string;
    ensino: string;
    fase: string;
    numero?: string;
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
        numero: t.numero || '',
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

/**
 * Mapeia o status interno do DC Digital para a etiqueta usada em documentos
 * oficiais de relação de alunos (ex.: CURSANDO, TRANS, REMAN).
 */
export function mapearSituacaoAluno(status?: string | null): string {
  const raw = (status || 'Ativo').trim();
  const key = raw.toLocaleLowerCase('pt-BR');

  if (!raw || key === 'ativo') return 'CURSANDO';
  if (key.includes('aguardando') && key.includes('transfer')) return 'TRANS';
  if (key.startsWith('trans') || key.includes('transfer')) return 'TRANS';
  if (key.startsWith('reman') || key.includes('remanej')) return 'REMAN';
  if (key.includes('desist') || key.includes('aband') || key.includes('defre')) return 'DEFRE';
  if (key === 'inativo') return 'INATIVO';

  return raw.toLocaleUpperCase('pt-BR').slice(0, 12);
}

/** Formata a matrícula do aluno como código de documento (sem usar CPF). */
export function formatarCodigoAluno(matricula?: string | null): string {
  const valor = (matricula || '').trim();
  return valor || '—';
}

/** Formata data de nascimento para DD/MM/AAAA. */
export function formatarDataNascimentoLista(data?: string | null): string {
  if (!data) return '—';
  const iso = data.includes('T') ? data.slice(0, 10) : data.trim();
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const br = iso.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return iso;
  return iso;
}

/** Número sequencial no padrão do documento oficial (001, 002...). */
export function formatarNumeroLista(indice: number): string {
  return String(indice).padStart(3, '0');
}

/**
 * Linhas em branco residuais no PDF (espaço para anotações / aspecto de formulário).
 * Turmas pequenas não recebem dezenas de linhas vazias; listas longas não são
 * preenchidas artificialmente e fluem para páginas seguintes.
 */
export function linhasEmBrancoLista(
  totalAlunos: number,
  maxVazias = 6,
  limiarSemPadding = 28
): number {
  if (totalAlunos <= 0) return 0;
  if (totalAlunos >= limiarSemPadding) return 0;
  // Poucas linhas extras, sem tentar “lotar” a página inteira.
  const proporcional = Math.min(maxVazias, Math.max(2, Math.ceil(totalAlunos * 0.35) + 1));
  return proporcional;
}

/** Texto de campo opcional do cabeçalho: vazio se o dado não existir. */
export function textoCampoOpcional(valor?: string | null): string {
  const limpo = (valor || '').trim();
  return limpo;
}
