/**
 * Consolidação pura de pendências docentes (Fase 3) — referência TypeScript.
 * I/O / RLS permanece em `pendenciasService.ts`.
 */

export interface PendenciaDocenteConsolidada {
  professor: string;
  dataLotacao: string;
  periodo: string;
  turno: string;
  ensino: string;
  fase: string;
  turma: string;
  componente: string;
  pendNotas: number;
  pendFreq: number;
  pendObjeto: number;
  unidade?: string;
}

export interface PendenciaGrupoInput {
  professor: string;
  turmaId: string;
  turma: string;
  componente: string;
  periodo: string;
  turno: string;
  ensino: string;
  fase: string;
  tempos: string[];
  totalAulasEsperadas: number;
  dateStart: string;
  dateEnd: string;
  periodoVariants: string[];
  dataLotacao: string;
}

export interface LancamentoSlot {
  turmaId: string;
  disciplina: string;
  tempo: string;
  data: string;
}

export interface AvaliacaoRef {
  id: string;
  turmaId: string;
  disciplina: string;
  bimestre: string;
}

export interface ContagemChave {
  key: string;
  total: number;
}

export interface ConsolidarPendenciasInput {
  groups: PendenciaGrupoInput[];
  frequencias: LancamentoSlot[];
  conteudos: LancamentoSlot[];
  avaliacoes: AvaliacaoRef[];
  alunoCounts: ContagemChave[];
  notasCounts: ContagemChave[];
}

/** Conta dias da semana (0=dom) em [start, end] inclusivo — O(1). Datas locais via Date. */
export function countWeekDaysInRange(start: Date, end: Date, dayOfWeek: number): number {
  if (start > end) return 0;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainder = totalDays % 7;
  const startDay = start.getDay();
  let extraDay = 0;
  for (let i = 0; i < remainder; i++) {
    if ((startDay + i) % 7 === dayOfWeek) {
      extraDay = 1;
      break;
    }
  }
  return fullWeeks + extraDay;
}

export function countWeekDaysInRangeIso(startIso: string, endIso: string, dayOfWeek: number): number {
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  return countWeekDaysInRange(new Date(sy, sm - 1, sd), new Date(ey, em - 1, ed), dayOfWeek);
}

function normalizeDataField(d: string): string | null {
  if (!d) return null;
  if (d.includes('/')) {
    const [dia, mes, ano] = d.split('/');
    const mm = mes.padStart(2, '0');
    const dd = dia.padStart(2, '0');
    return `${ano}-${mm}-${dd}`;
  }
  if (d.length >= 10 && d[4] === '-') return d.slice(0, 10);
  return null;
}

function pctPendencia(esperadas: number, feitas: number): number {
  if (esperadas <= 0) return 0;
  return parseFloat((Math.max(0, ((esperadas - feitas) / esperadas) * 100)).toFixed(2));
}

export function consolidarPendencias(input: ConsolidarPendenciasInput): PendenciaDocenteConsolidada[] {
  const freqIndex = new Map<string, Array<{ data: string; tempo: string }>>();
  for (const f of input.frequencias) {
    const key = `${f.turmaId}|${f.disciplina}`;
    const arr = freqIndex.get(key);
    if (arr) arr.push({ data: f.data, tempo: f.tempo });
    else freqIndex.set(key, [{ data: f.data, tempo: f.tempo }]);
  }

  const contIndex = new Map<string, Array<{ data: string; tempo: string }>>();
  for (const c of input.conteudos) {
    const key = `${c.turmaId}|${c.disciplina}`;
    const arr = contIndex.get(key);
    if (arr) arr.push({ data: c.data, tempo: c.tempo });
    else contIndex.set(key, [{ data: c.data, tempo: c.tempo }]);
  }

  const avIndex = new Map<string, AvaliacaoRef[]>();
  for (const av of input.avaliacoes) {
    const key = `${av.turmaId}|${av.disciplina}`;
    const arr = avIndex.get(key);
    if (arr) arr.push(av);
    else avIndex.set(key, [av]);
  }

  const alunoCounts = new Map(input.alunoCounts.map(c => [c.key, c.total]));
  const notasCounts = new Map(input.notasCounts.map(c => [c.key, c.total]));

  return input.groups.map(group => {
    const temposSet = new Set(group.tempos);
    const groupKey = `${group.turmaId}|${group.componente}`;
    const variants = new Set(group.periodoVariants.map(v => v.toUpperCase()));

    const groupFreqs = freqIndex.get(groupKey) || [];
    const freqCount = new Set(
      groupFreqs
        .filter(f => {
          if (!temposSet.has(f.tempo)) return false;
          const norm = normalizeDataField(f.data);
          return !!norm && norm >= group.dateStart && norm <= group.dateEnd;
        })
        .map(f => `${f.data}|${f.tempo}`)
    ).size;

    const groupConts = contIndex.get(groupKey) || [];
    const contCount = new Set(
      groupConts
        .filter(c => {
          if (!temposSet.has(c.tempo)) return false;
          const norm = normalizeDataField(c.data);
          return !!norm && norm >= group.dateStart && norm <= group.dateEnd;
        })
        .map(c => `${c.data}|${c.tempo}`)
    ).size;

    const totalAlunos = alunoCounts.get(group.turmaId) || 0;
    let pNotas = 0;
    const groupAvs = (avIndex.get(groupKey) || []).filter(av =>
      variants.has((av.bimestre || '').toUpperCase())
    );

    if (groupAvs.length > 0 && totalAlunos > 0) {
      let notasNoLote = 0;
      for (const av of groupAvs) {
        notasNoLote += notasCounts.get(av.id) || 0;
      }
      const totalNotasEsperadas = groupAvs.length * totalAlunos;
      pNotas = parseFloat(
        (Math.max(0, ((totalNotasEsperadas - notasNoLote) / totalNotasEsperadas) * 100)).toFixed(2)
      );
    }

    return {
      professor: group.professor,
      dataLotacao: group.dataLotacao,
      periodo: group.periodo,
      turno: group.turno,
      ensino: group.ensino,
      fase: group.fase,
      turma: group.turma,
      componente: group.componente,
      pendFreq: pctPendencia(group.totalAulasEsperadas, freqCount),
      pendObjeto: pctPendencia(group.totalAulasEsperadas, contCount),
      pendNotas: pNotas,
    };
  });
}
