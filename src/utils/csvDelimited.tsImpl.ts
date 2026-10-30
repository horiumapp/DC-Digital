/**
 * Implementação TypeScript de referência do parse delimitado (CSV/TSV).
 */

import { sanitizeFormulaValue as sanitizeFormulaValueLocal } from './sanitizeUtils';

export function sanitizeFormulaValue(value: string): string {
  return sanitizeFormulaValueLocal(value);
}

/**
 * Analisador robusto de texto delimitado (CSV / TSV)
 * Suporta separadores comuns (; , \t) e campos delimitados por aspas duplas.
 */
export function parseDelimitedText(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return { headers: [], rows: [] };

  const lines = clean.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const countSemi = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const countTab = (firstLine.match(/\t/g) || []).length;

  let delimiter = ';';
  if (countTab > countSemi && countTab > countComma) delimiter = '\t';
  else if (countComma > countSemi) delimiter = ',';

  function splitLine(line: string): string[] {
    const entries: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        entries.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    entries.push(cur.trim());
    return entries;
  }

  const parsedLines = lines.map(splitLine);
  const headers = parsedLines[0].map(h => h.replace(/^["']|["']$/g, '').trim());
  const rows = parsedLines.slice(1).filter(r => r.some(c => c.length > 0));

  return { headers, rows };
}
