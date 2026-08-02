import { Avaliacao, Aluno } from '../contexts/TurmaContext';
import { formatarDataParaISO, formatarDataParaExibicao } from './dateUtils';

/**
 * Verifica se uma avaliação possui pendências de notas, RP ou 2ª Chamada.
 */
export function isAvaliacaoPendente(
  av: Avaliacao,
  avaliacoes: Avaliacao[],
  alunos: Aluno[],
  faltasPorData: Record<string, Set<string>>
): boolean {
  if (!alunos || alunos.length === 0) return false;

  // 1. Avaliação Principal (!av.parent_id)
  if (!av.parent_id) {
    const dataIso = formatarDataParaISO(av.data);
    const faltasNoDia = faltasPorData[dataIso] || new Set();
    const alunosPresentes = alunos.filter(a => !faltasNoDia.has(a.id));

    // A) Checar notas da avaliação principal
    if (alunosPresentes.length > 0) {
      const temNotaPrincipalPendente = alunosPresentes.some(a => {
        const nota = a.notas?.[av.id] ?? a.notas?.[String(av.id)];
        return nota === undefined || nota === null || String(nota).trim() === '';
      });
      if (temNotaPrincipalPendente) return true;
    }

    // B) Checar se há alunos abaixo da média (Recuperação Paralela necessária)
    const maxVal = av.valorMaximo ? Number(av.valorMaximo) : 10;
    const mediaCorte = maxVal / 2;
    const alunosAbaixoDaMedia = alunos.filter(aluno => {
      const notaStr = aluno.notas?.[av.id] ?? aluno.notas?.[String(av.id)];
      const nota = parseFloat(String(notaStr || '').replace(',', '.'));
      return !isNaN(nota) && nota < mediaCorte;
    });

    if (alunosAbaixoDaMedia.length > 0) {
      const rpAv = avaliacoes.find(item => String(item.parent_id) === String(av.id) && item.tipo.includes('RP'));
      
      // Se não criou a RP para a avaliação principal, há pendência!
      if (!rpAv) return true;

      // Se criou a RP, verificar se as notas da RP foram lançadas para todos os elegíveis
      const temNotaRPPendente = alunosAbaixoDaMedia.some(aluno => {
        const notaRP = aluno.notas?.[rpAv.id] ?? aluno.notas?.[String(rpAv.id)];
        return notaRP === undefined || notaRP === null || String(notaRP).trim() === '';
      });
      if (temNotaRPPendente) return true;
    }

    // C) Checar Segunda Chamada (2CH) se foi criada
    const chAv = avaliacoes.find(item => String(item.parent_id) === String(av.id) && item.tipo.includes('2CH'));
    if (chAv) {
      const alunosFaltosos = alunos.filter(a => faltasNoDia.has(a.id));
      if (alunosFaltosos.length > 0) {
        const temNota2CHPendente = alunosFaltosos.some(aluno => {
          const nota2CH = aluno.notas?.[chAv.id] ?? aluno.notas?.[String(chAv.id)];
          return nota2CH === undefined || nota2CH === null || String(nota2CH).trim() === '';
        });
        if (temNota2CHPendente) return true;
      }
    }
  } else {
    // 2. Sub-avaliação (RP ou 2CH)
    const parentAv = avaliacoes.find(a => String(a.id) === String(av.parent_id));
    if (parentAv) {
      if (av.tipo.includes('RP')) {
        const maxVal = parentAv.valorMaximo ? Number(parentAv.valorMaximo) : 10;
        const mediaCorte = maxVal / 2;
        const alunosAbaixoDaMedia = alunos.filter(aluno => {
          const notaStr = aluno.notas?.[parentAv.id] ?? aluno.notas?.[String(parentAv.id)];
          const nota = parseFloat(String(notaStr || '').replace(',', '.'));
          return !isNaN(nota) && nota < mediaCorte;
        });

        return alunosAbaixoDaMedia.some(aluno => {
          const notaRP = aluno.notas?.[av.id] ?? aluno.notas?.[String(av.id)];
          return notaRP === undefined || notaRP === null || String(notaRP).trim() === '';
        });
      }

      if (av.tipo.includes('2CH')) {
        const dataIso = formatarDataParaISO(parentAv.data);
        const faltasNoDia = faltasPorData[dataIso] || new Set();
        const alunosFaltosos = alunos.filter(a => faltasNoDia.has(a.id));

        return alunosFaltosos.some(aluno => {
          const nota2CH = aluno.notas?.[av.id] ?? aluno.notas?.[String(av.id)];
          return nota2CH === undefined || nota2CH === null || String(nota2CH).trim() === '';
        });
      }
    }
  }

  return false;
}

/**
 * Retorna mensagem descritiva detalhando a pendência da avaliação.
 */
export function getMensagemPendenciaAvaliacao(
  av: Avaliacao,
  avaliacoes: Avaliacao[],
  alunos: Aluno[],
  faltasPorData: Record<string, Set<string>>
): string {
  const dataIso = formatarDataParaISO(av.data);
  const faltasNoDia = faltasPorData[dataIso] || new Set();
  const alunosPresentes = alunos.filter(a => !faltasNoDia.has(a.id));

  const temNotaPrincipalPendente = alunosPresentes.some(a => {
    const nota = a.notas?.[av.id] ?? a.notas?.[String(av.id)];
    return nota === undefined || nota === null || String(nota).trim() === '';
  });

  if (temNotaPrincipalPendente) {
    return `A avaliação anterior (${av.tipo} - ${formatarDataParaExibicao(av.data)}) possui notas pendentes. Por favor, lance as notas de todos os alunos antes de cadastrar uma nova.`;
  }

  const maxVal = av.valorMaximo ? Number(av.valorMaximo) : 10;
  const mediaCorte = maxVal / 2;
  const alunosAbaixoDaMedia = alunos.filter(aluno => {
    const notaStr = aluno.notas?.[av.id] ?? aluno.notas?.[String(av.id)];
    const nota = parseFloat(String(notaStr || '').replace(',', '.'));
    return !isNaN(nota) && nota < mediaCorte;
  });

  if (alunosAbaixoDaMedia.length > 0) {
    const rpAv = avaliacoes.find(item => String(item.parent_id) === String(av.id) && item.tipo.includes('RP'));
    if (!rpAv) {
      return `A avaliação anterior (${av.tipo}) possui aluno(s) com nota abaixo da média. É necessário adicionar a Recuperação Paralela (RP) e lançar as notas da RP antes de cadastrar uma nova avaliação.`;
    }
    return `A Recuperação Paralela (${rpAv.tipo}) da avaliação ${av.tipo} possui notas pendentes. Por favor, lance as notas da RP antes de cadastrar uma nova avaliação.`;
  }

  return `A avaliação anterior (${av.tipo}) possui pendências. Por favor, resolva as pendências da avaliação anterior antes de cadastrar uma nova.`;
}

/**
 * Retorna o limite máximo de pontos para o bimestre.
 * 1º e 2º Bimestres = 20.0 pontos.
 * 3º e 4º Bimestres = 30.0 pontos.
 */
export function getLimitePontosBimestre(bimestreOuData: string): number {
  const str = String(bimestreOuData || '').toUpperCase();
  if (str.includes('3') || str.includes('4')) return 30.0;
  return 20.0;
}

/**
 * Retorna o total de pontos já utilizados em avaliações principais no bimestre
 * e a quantidade de pontos disponíveis para uma nova avaliação.
 */
export function getInfoPontosBimestre(
  bimestre: string,
  avaliacoes: Avaliacao[],
  avaliacaoAtualId?: string | number
): { limite: number; somaExistentes: number; pontosDisponiveis: number } {
  const limite = getLimitePontosBimestre(bimestre);

  // Filtrar apenas avaliações principais (!av.parent_id) do mesmo bimestre
  const avaliacoesDoBimestre = avaliacoes.filter(av => {
    if (av.parent_id) return false;
    if (avaliacaoAtualId && String(av.id) === String(avaliacaoAtualId)) return false;
    const bNome = av.bimestre || getBimestrePorData(av.data);
    return bNome === bimestre;
  });

  const somaExistentes = avaliacoesDoBimestre.reduce((acc, av) => {
    const val = Number(av.valorMaximo ?? 10);
    return acc + (isNaN(val) ? 10 : val);
  }, 0);

  const pontosDisponiveis = Math.max(0, limite - somaExistentes);

  return { limite, somaExistentes, pontosDisponiveis };
}
