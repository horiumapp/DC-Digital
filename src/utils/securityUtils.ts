/**
 * Utilitários de segurança para prevenir vulnerabilidades como XSS.
 */

/**
 * Sanatiza uma URL para uso em atributos como src ou href.
 * Bloqueia protocolos perigosos como javascript: e vbscript:.
 */
export const sanitizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  const trimmedUrl = url.trim();
  
  // Bloqueia javascript:, vbscript:, etc.
  // Permite http:, https:, caminhos relativos (/), e data:image/ (comum para logos em base64)
  const isSafe = /^(https?:\/\/|\/|data:image\/)/i.test(trimmedUrl);
  
  if (isSafe) {
    return trimmedUrl;
  }

  // Se não começar com os protocolos seguros, verifica se contém javascript:
  if (/^javascript:/i.test(trimmedUrl)) {
    return '';
  }

  // Por padrão, se não for um protocolo conhecido seguro, retornamos vazio para evitar riscos
  // mas permitimos se parecer um caminho relativo simples (sem protocolo)
  if (!trimmedUrl.includes(':')) {
    return trimmedUrl;
  }

  return '';
};
