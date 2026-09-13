export function translateSupabaseError(errorOrMsg: unknown): string {
  if (!errorOrMsg) return 'Ocorreu um erro inesperado.';

  let raw = '';
  if (typeof errorOrMsg === 'string') {
    raw = errorOrMsg;
  } else if (typeof errorOrMsg === 'object' && errorOrMsg !== null) {
    const errObj = errorOrMsg as { message?: string; code?: string; error_code?: string };
    raw = [errObj.code, errObj.error_code, errObj.message].filter(Boolean).join(' ');
  } else {
    raw = String(errorOrMsg);
  }

  const code = raw.toLowerCase();

  // ---- Rate Limiting ----
  if (
    code.includes('email rate limit exceeded') ||
    code.includes('over_email_send_rate_limit') ||
    code.includes('rate limit')
  ) {
    return 'Limite de tentativas excedido. Aguarde alguns minutos antes de tentar novamente.';
  }

  // ---- Senha Atual & Alteração de Senha ----
  if (
    code.includes('current_password_invalid') ||
    code.includes('current_password_mismatch') ||
    code.includes('current password required') ||
    code.includes('current_password_required') ||
    code.includes('current password')
  ) {
    return 'Senha atual incorreta. Verifique os dados e tente novamente.';
  }
  if (code.includes('reauthentication_needed') || code.includes('reauthentication')) {
    return 'Sua sessão precisa ser revalidada. Saia e entre novamente no sistema antes de alterar a senha.';
  }
  if (code.includes('same as the old password') || code.includes('different from the old password') || code.includes('same password')) {
    return 'A nova senha deve ser diferente da senha atual.';
  }
  if (code.includes('password') && code.includes('confirmation') && code.includes('match')) {
    return 'As senhas não coincidem. Verifique e tente novamente.';
  }
  if (code.includes('password should be at least 6 characters')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (
    code.includes('weak_password') ||
    code.includes('password is too weak') ||
    code.includes('password is known to be weak') ||
    code.includes('easy to guess') ||
    code.includes('password is known to be leaked') ||
    code.includes('password has been found in a data leak') ||
    code.includes('breach') ||
    code.includes('leak') ||
    code.includes('pwned') ||
    code.includes('compromised') ||
    code.includes('unsafe password')
  ) {
    return 'Esta senha é muito fraca, fácil de adivinhar ou já foi exposta em vazamentos. Escolha uma senha mais forte e diferente.';
  }
  if (code.includes('should contain at least one character') || code.includes('character of each')) {
    return 'A senha não atende aos requisitos de complexidade exigidos (letras maiúsculas, minúsculas, números e símbolos).';
  }

  // ---- Cadastro ----
  if (code.includes('user already registered') || code.includes('already been registered')) {
    return 'Este e-mail já está cadastrado no sistema. Tente fazer o login.';
  }

  // ---- Login ----
  if (code.includes('invalid login credentials') || code.includes('invalid_credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (
    code.includes('email not confirmed') ||
    code.includes('email link is invalid or has expired') ||
    code.includes('email_not_confirmed')
  ) {
    return 'Verifique sua caixa de e-mail e clique no link de confirmação para acessar.';
  }
  if (code.includes('user not found')) {
    return 'Usuário não encontrado. Verifique o e-mail informado.';
  }
  if (code.includes('too many requests') || code.includes('429')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }

  // ---- Sessão ----
  if (
    code.includes('token expired') ||
    code.includes('jwt expired')
  ) {
    return 'Sua sessão expirou. Faça o login novamente.';
  }
  if (
    code.includes('auth session missing') ||
    code.includes('session missing') ||
    code.includes('invalid flow state') ||
    code.includes('code_verifier') ||
    code.includes('pkce')
  ) {
    return 'O link de redefinição de senha é inválido ou expirou. Solicite um novo link de recuperação.';
  }
  if (code.includes('not authenticated') || code.includes('unauthorized')) {
    return 'Você precisa estar autenticado para realizar esta ação.';
  }

  // ---- Rede ----
  if (code.includes('network error') || code.includes('failed to fetch')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }
  if (code.includes('timeout')) {
    return 'A requisição demorou demais. Verifique sua conexão e tente novamente.';
  }

  // ---- Banco de Dados ----
  if (code.includes('duplicate key') || code.includes('unique constraint')) {
    return 'Já existe um registro com esses dados. Verifique os campos e tente novamente.';
  }
  if (code.includes('violates foreign key')) {
    return 'Operação inválida: este registro está vinculado a outros dados no sistema.';
  }
  if (code.includes('row-level security') || code.includes('new row violates')) {
    return 'Você não tem permissão para realizar esta operação.';
  }

  // Retorno genérico seguro (não exibe o texto bruto em inglês para o usuário final)
  return 'Ocorreu um erro inesperado. Verifique os dados e tente novamente.';
}
