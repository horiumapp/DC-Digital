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

export const isNomeValido = (nome?: string | null): boolean => {
  if (!nome) return false;
  const clean = nome.trim().toLowerCase();
  if (!clean) return false;
  const placeholders = [
    'não localizado',
    'nao localizado',
    'não informado',
    'nao informado',
    'não cadastrado',
    'nao cadastrado',
    'n/d',
    'nd',
    '---',
    '--',
    '-',
    'null',
    'undefined',
    'diretor n/d',
    'secretario n/d',
    'secretário n/d'
  ];
  return !placeholders.includes(clean);
};

export type EquipeEscolarClient = {
  from: (table: string) => any;
  rpc?: (fn: string, args?: Record<string, unknown>) => any;
};

export async function obterEquipeEscolar(
  supabaseClient: EquipeEscolarClient | null | undefined,
  escolaId?: string | null,
  fallbackDiretor?: string | null,
  fallbackSecretario?: string | null
): Promise<{ diretorNome: string; secretarioNome: string }> {
  let diretorNome = '';
  let secretarioNome = '';

  if (escolaId && supabaseClient) {
    try {
      const res = await supabaseClient
        .from('usuarios')
        .select('nome_completo, cargo')
        .eq('escola_id', escolaId)
        .in('cargo', ['GESTOR', 'SECRETARIO'])
        .order('criado_em', { ascending: true });

      const equipeUsers = (res?.data || []) as Array<{ cargo?: string | null; nome_completo?: string | null }>;
      if (equipeUsers.length > 0) {
        const gestorUser = equipeUsers.find(u => u.cargo === 'GESTOR');
        if (gestorUser?.nome_completo && isNomeValido(gestorUser.nome_completo)) {
          diretorNome = gestorUser.nome_completo.trim();
        }

        const secUser = equipeUsers.find(u => u.cargo === 'SECRETARIO');
        if (secUser?.nome_completo && isNomeValido(secUser.nome_completo)) {
          secretarioNome = secUser.nome_completo.trim();
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar usuarios da equipe escolar:', err);
    }

    if ((!secretarioNome || !diretorNome) && typeof supabaseClient.rpc === 'function') {
      try {
        const [secRpc, dirRpc] = await Promise.all([
          !secretarioNome ? supabaseClient.rpc('get_secretario_escola', { p_escola_id: escolaId }) : Promise.resolve({ data: null, error: null }),
          !diretorNome ? supabaseClient.rpc('get_diretor_escola', { p_escola_id: escolaId }) : Promise.resolve({ data: null, error: null }),
        ]);

        if (!secretarioNome && secRpc?.data && typeof secRpc.data === 'string' && isNomeValido(secRpc.data)) {
          secretarioNome = secRpc.data.trim();
        }
        if (!diretorNome && dirRpc?.data && typeof dirRpc.data === 'string' && isNomeValido(dirRpc.data)) {
          diretorNome = dirRpc.data.trim();
        }
      } catch {
        // Fallback silencioso
      }
    }
  }

  if (!diretorNome && isNomeValido(fallbackDiretor)) {
    diretorNome = fallbackDiretor!.trim();
  }
  if (!secretarioNome && isNomeValido(fallbackSecretario)) {
    secretarioNome = fallbackSecretario!.trim();
  }

  return { diretorNome, secretarioNome };
}
