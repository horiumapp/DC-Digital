export function translateSupabaseError(errorMsg: string | undefined): string {
  if (!errorMsg) return 'Ocorreu um erro inesperado.';

  const code = errorMsg.toLowerCase();

  // ---- Rate Limiting ----
  if (
    code.includes('email rate limit exceeded') ||
    code.includes('over_email_send_rate_limit') ||
    code.includes('rate limit')
  ) {
    return 'Limite de tentativas excedido. Aguarde alguns minutos antes de tentar novamente.';
  }

  // ---- Cadastro ----
  if (code.includes('user already registered') || code.includes('already been registered')) {
    return 'Este e-mail já está cadastrado no sistema. Tente fazer o login.';
  }
  if (code.includes('password should be at least 6 characters')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (code.includes('weak_password') || code.includes('password is too weak')) {
    return 'Esta senha é muito fraca ou já foi exposta em vazamentos. Tente uma combinação mais forte.';
  }
  if (code.includes('password') && code.includes('confirmation') && code.includes('match')) {
    return 'As senhas não coincidem. Verifique e tente novamente.';
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
  if (code.includes('token expired') || code.includes('jwt expired')) {
    return 'Sua sessão expirou. Faça o login novamente.';
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
