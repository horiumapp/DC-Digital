/**
 * Utilitários para gestão de logos e identificação visual de escolas.
 */

// Mapeamento de termos no nome da escola para logos locais na pasta public
const MAPA_LOGOS_NOMES: Array<{ pattern: RegExp; file: string }> = [
  { pattern: /DANILO/i, file: '/Danilo.png' },
  { pattern: /PENHA\s+SAID/i, file: '/Penha Said.png' },
  { pattern: /MARIA\s+MADALENA/i, file: '/Maria Madalena.png' },
  { pattern: /FRANCISCA\s+MENDES/i, file: '/Francisca Mendes.png' },
  { pattern: /JOS[EÉ]\s+MAIA/i, file: '/José Maia.png' },
  { pattern: /PASTOR\s+JOS[EÉ]\s+REIS|PASTOR\s+REIS/i, file: '/Pastor José Reis.png' },
  { pattern: /PRESIDENTE\s+VARGAS/i, file: '/Presidente Vargas.png' },
  { pattern: /SOCORRO\s+BRITO/i, file: '/Socorro Brito.png' },
  { pattern: /FILAD[EÉ]LFIA/i, file: '/Filadelfia.png' },
  { pattern: /TURMA\s+DA\s+M[OÔ]NICA|M[OÔ]NICA/i, file: '/Turma da Monica.png' },
  { pattern: /S[AÃ]O\s+FRANCISCO/i, file: '/São Francisco.png' },
];

export const LOGO_PADRAO_SEMED = '/semed.png';

export interface EscolaVisualInfo {
  logo_url?: string | null;
  nome?: string | null;
}

/**
 * Tenta encontrar um logo correspondente pelo nome da escola.
 * Retorna o caminho do logo (ex: '/Danilo.png') ou null se não encontrar.
 */
export function findSuggestedLogo(nome?: string | null): string | null {
  if (!nome) return null;
  for (const item of MAPA_LOGOS_NOMES) {
    if (item.pattern.test(nome)) {
      return item.file;
    }
  }
  return null;
}

/**
 * Retorna o logo da escola.
 * Prioridade:
 * 1. logo_url configurado (seja URL externa, base64 ou caminho local).
 * 2. Correspondência automática com arquivo local pelo nome da escola.
 * 3. Fallback padrão: '/semed.png'.
 */
export function getEscolaLogo(escola?: EscolaVisualInfo | null): string {
  if (escola?.logo_url && escola.logo_url.trim()) {
    const trimmed = escola.logo_url.trim();
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('/')
    ) {
      return trimmed;
    }
    return `/${trimmed}`;
  }

  const suggested = findSuggestedLogo(escola?.nome);
  if (suggested) {
    return suggested;
  }

  return LOGO_PADRAO_SEMED;
}
