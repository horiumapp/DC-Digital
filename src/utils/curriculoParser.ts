import { sanitizeFormulaValue } from './sanitizeUtils';

export interface ParsedCurriculoItem {
  modalidade: string;
  ano: string;
  disciplina: string;
  bimestre: string;
  nome: string;
  objetos: string[];
}

export interface CurriculoParseResult {
  records: ParsedCurriculoItem[];
  totalObjetos: number;
  anosEncontrados: string[];
  disciplinasEncontradas: string[];
  bimestresEncontrados: string[];
  avisos: string[];
}

export const DISCIPLINAS_PADRAO = [
  "Português",
  "Matemática",
  "Ciências",
  "História",
  "Geografia",
  "Artes",
  "Educação Física",
  "Inglês",
  "Ensino Religioso",
  "Espanhol"
];

export const BIMESTRES_PADRAO = [
  "1º Bimestre",
  "2º Bimestre",
  "3º Bimestre",
  "4º Bimestre"
];

function cleanHeaderString(c: string): string {
  return (c || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\uFFFD\u00A0]/g, ' ')
    .trim();
}

/**
 * Normaliza o nome da disciplina para um dos padrões do sistema.
 */
export function normalizeDisciplina(raw: string): string {
  const s = cleanHeaderString(raw);

  if (s.includes('PORTUG')) return 'Português';
  if (s.includes('MATEM')) return 'Matemática';
  if (s.includes('HIST')) return 'História';
  if (s.includes('GEOG')) return 'Geografia';
  if (s.includes('ARTE')) return 'Artes';
  if (s.includes('CIENC') || s.includes('CINC')) return 'Ciências';
  if (s.includes('FISIC')) return 'Educação Física';
  if (s.includes('RELIG')) return 'Ensino Religioso';
  if (s.includes('ESPANH')) return 'Espanhol';
  if (s.includes('INGL')) return 'Inglês';

  return (raw || '').trim();
}

/**
 * Normaliza o ano/série escolar (ex: "6º Ano").
 */
export function normalizeAno(raw: string): string {
  const match = (raw || '').match(/(\d+)/);
  if (match) return `${match[1]}º Ano`;
  return (raw || '').trim();
}

/**
 * Normaliza o bimestre escolar (ex: "1º Bimestre").
 */
export function normalizeBimestre(raw: string): string {
  const match = (raw || '').match(/([1-4])/);
  if (match) return `${match[1]}º Bimestre`;
  return (raw || '').trim();
}

/**
 * Define a modalidade com base no Ano.
 */
export function getModalidadeForAno(ano: string): string {
  const match = ano.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 5) return 'Fundamental Anos Iniciais (1° ao 5° ANO)';
    if (num >= 6 && num <= 9) return 'Fundamental Anos Finais (6° ao 9° ANO)';
  }
  return 'Fundamental Anos Iniciais (1° ao 5° ANO)';
}

/**
 * Limpa o texto de um conteúdo ministrado, removendo marcadores, traços ou numerações.
 */
export function cleanContentText(str: string): string {
  return (str || '')
    .replace(/^[\s\-–—•*.\d)\uFFFD]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSubjectHeaderCell(c: string): boolean {
  if (!c || c.length > 40) return false;
  const s = cleanHeaderString(c);
  return /^(GEOGRAFIA|HIST|MATEM|PORTUG|ARTES|CIENC|CINC|EDUCA.*FISIC|ENSINO\s+RELIGIOSO|ESPANHOL|INGL)/i.test(s);
}

function isBimestreHeaderRow(line: string): boolean {
  const cells = line.split(/[\t;]/).map(c => c.trim()).filter(Boolean);
  if (cells.length === 0) return false;
  const bimCells = cells.filter(c => /BIMESTRE/i.test(c));
  return bimCells.length >= 2 || /BIMESTRE/i.test(cells[0]);
}

/**
 * Parser principal de conteúdos curriculares (BNCC).
 * Suporta formatos:
 * 1. Matriz colunar lado a lado (ex: Conteúdos.txt exportado do Excel)
 * 2. Linhas CSV/TSV delimitadas (Modalidade;Ano;Disciplina;Bimestre;Conteudo)
 */
export function parseCurriculoText(rawText: string): CurriculoParseResult {
  const avisos: string[] = [];
  if (!rawText || !rawText.trim()) {
    return {
      records: [],
      totalObjetos: 0,
      anosEncontrados: [],
      disciplinasEncontradas: [],
      bimestresEncontrados: [],
      avisos: ['Texto vazio ou não fornecido.']
    };
  }

  const lines = rawText.split(/\r?\n/);

  // 1. Tentar verificar se é CSV/TSV linha a linha tradicional
  const firstNonEmptyLine = lines.find(l => l.trim().length > 0) || '';
  const firstCells = firstNonEmptyLine.split(/[\t;,]/).map(c => c.trim().toLowerCase());
  const hasLineByLineHeaders = (
    firstCells.includes('disciplina') && 
    (firstCells.includes('ano') || firstCells.includes('serie') || firstCells.includes('série')) &&
    (firstCells.includes('conteudo') || firstCells.includes('conteúdo') || firstCells.includes('objeto'))
  );

  if (hasLineByLineHeaders) {
    return parseLineByLineFormat(lines, firstCells);
  }

  // 2. Parser de Matriz Colunar (formato padrão de planilhas escolares / Conteúdos.txt)
  return parseMatrixFormat(lines, avisos);
}

function parseLineByLineFormat(lines: string[], headerCells: string[]): CurriculoParseResult {
  const avisos: string[] = [];
  const recordsMap = new Map<string, ParsedCurriculoItem>();

  const discCol = headerCells.findIndex(c => c.includes('disciplina'));
  const anoCol = headerCells.findIndex(c => c.includes('ano') || c.includes('serie') || c.includes('série'));
  const bimCol = headerCells.findIndex(c => c.includes('bimestre'));
  const contCol = headerCells.findIndex(c => c.includes('conteudo') || c.includes('conteúdo') || c.includes('objeto'));
  const modCol = headerCells.findIndex(c => c.includes('modalidade'));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cells = line.split(/[\t;,]/).map(c => c.trim());
    if (cells.length < 3) continue;

    const rawDisc = cells[discCol] || '';
    const rawAno = cells[anoCol] || '';
    const rawBim = bimCol >= 0 ? cells[bimCol] : '1º Bimestre';
    const rawCont = cells[contCol] || '';
    const rawMod = modCol >= 0 ? cells[modCol] : '';

    if (!rawDisc || !rawCont) continue;

    const disciplina = normalizeDisciplina(rawDisc);
    const ano = normalizeAno(rawAno);
    const bimestre = normalizeBimestre(rawBim);
    const modalidade = rawMod || getModalidadeForAno(ano);
    const conteudo = cleanContentText(rawCont);

    if (!conteudo) continue;

    const key = `${modalidade}|${ano}|${disciplina}|${bimestre}`;
    if (!recordsMap.has(key)) {
      recordsMap.set(key, {
        modalidade,
        ano,
        disciplina,
        bimestre,
        nome: conteudo,
        objetos: []
      });
    }

    const item = recordsMap.get(key)!;
    if (!item.objetos.includes(conteudo)) {
      item.objetos.push(conteudo);
    }
  }

  const records = Array.from(recordsMap.values());
  const totalObjetos = records.reduce((acc, r) => acc + r.objetos.length, 0);

  return {
    records,
    totalObjetos,
    anosEncontrados: [...new Set(records.map(r => r.ano))],
    disciplinasEncontradas: [...new Set(records.map(r => r.disciplina))],
    bimestresEncontrados: [...new Set(records.map(r => r.bimestre))],
    avisos
  };
}

function parseMatrixFormat(lines: string[], avisos: string[]): CurriculoParseResult {
  const headerIndices: number[] = [];
  lines.forEach((l, idx) => {
    const cells = l.split(/[\t;]/).map(c => c.trim()).filter(Boolean);
    const subjectHeaders = cells.filter(isSubjectHeaderCell);
    if (subjectHeaders.length >= 4) {
      headerIndices.push(idx);
    }
  });

  if (headerIndices.length === 0) {
    avisos.push('Nenhum cabeçalho de disciplinas reconhecido no arquivo.');
    return {
      records: [],
      totalObjetos: 0,
      anosEncontrados: [],
      disciplinasEncontradas: [],
      bimestresEncontrados: [],
      avisos
    };
  }

  const records: ParsedCurriculoItem[] = [];
  const bNames = BIMESTRES_PADRAO;

  headerIndices.forEach((hIdx, blockIdx) => {
    const headerCells = lines[hIdx].split(/[\t;]/).map(c => c.trim());
    const nextHIdx = headerIndices[blockIdx + 1] || lines.length;
    const blockLines = lines.slice(hIdx + 1, nextHIdx);

    const bMarkers: number[] = [];
    blockLines.forEach((bl, offset) => {
      if (isBimestreHeaderRow(bl)) {
        bMarkers.push(offset);
      }
    });

    headerCells.forEach((hCell, colIdx) => {
      if (!isSubjectHeaderCell(hCell)) return;
      const disciplina = normalizeDisciplina(hCell);

      let ano = '';
      const match = hCell.match(/(\d+)\s*º?\s*ANO/i);
      if (match) {
        ano = `${match[1]}º Ano`;
      } else {
        if (colIdx < 4) {
          ano = `${blockIdx + 1}º Ano`;
        } else {
          ano = blockIdx === 0 ? '6º Ano' : '7º Ano';
        }
      }

      const modalidade = getModalidadeForAno(ano);

      bMarkers.forEach((bOffset, bIdx) => {
        const bimName = bNames[bIdx] || `${bIdx + 1}º Bimestre`;
        const startLine = bOffset + 1;
        const endLine = (bIdx + 1 < bMarkers.length) ? bMarkers[bIdx + 1] : blockLines.length;

        const objetos: string[] = [];
        for (let r = startLine; r < endLine; r++) {
          const rowCells = blockLines[r].split(/[\t;]/);
          const cell = (rowCells[colIdx] || '').trim();
          const cleaned = cleanContentText(cell);
          if (cleaned && !/BIMESTRE/i.test(cleaned) && cleaned.length > 1) {
            if (!objetos.includes(cleaned)) {
              objetos.push(cleaned);
            }
          }
        }

        if (objetos.length > 0) {
          records.push({
            modalidade,
            ano,
            disciplina,
            bimestre: bimName,
            nome: objetos[0],
            objetos
          });
        }
      });
    });
  });

  const totalObjetos = records.reduce((acc, r) => acc + r.objetos.length, 0);

  return {
    records,
    totalObjetos,
    anosEncontrados: [...new Set(records.map(r => r.ano))],
    disciplinasEncontradas: [...new Set(records.map(r => r.disciplina))],
    bimestresEncontrados: [...new Set(records.map(r => r.bimestre))],
    avisos
  };
}

export interface CurriculoExportSource {
  modalidade: string;
  ano: string;
  disciplina: string;
  bimestre: string;
  nome?: string;
  objetos?: Array<{ id?: string; descricao?: string } | string>;
}

function escapeCsvCell(val: string): string {
  const sanitized = sanitizeFormulaValue(val || '');
  if (sanitized.includes(';') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

/**
 * Converte uma lista de unidades curriculares em conteúdo CSV (delimitado por ;)
 * com BOM UTF-8 (\uFEFF) para compatibilidade nativa com Microsoft Excel.
 */
export function exportCurriculoToCsv(unidades: CurriculoExportSource[]): string {
  const header = ['Modalidade', 'Ano', 'Disciplina', 'Bimestre', 'Conteúdo'].join(';');
  const rows: string[] = [header];

  for (const u of unidades) {
    const objs = u.objetos || [];
    for (const o of objs) {
      const desc = typeof o === 'string' ? o : (o.descricao || '');
      if (!desc.trim()) continue;
      rows.push([
        escapeCsvCell(u.modalidade),
        escapeCsvCell(u.ano),
        escapeCsvCell(u.disciplina),
        escapeCsvCell(u.bimestre),
        escapeCsvCell(desc.trim())
      ].join(';'));
    }
  }

  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Dispara o download de um arquivo CSV diretamente no navegador.
 */
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
