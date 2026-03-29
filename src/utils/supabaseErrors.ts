export function translateSupabaseError(errorMsg: string | undefined): string {
  if (!errorMsg) return 'Ocorreu um erro inesperado.';

  const code = errorMsg.toLowerCase();

  // Mapeamento de Erros de Autenticação do Supabase
  if (code.includes('email rate limit exceeded')) {
    return 'Limite de tentativas excedido. Por favor, aguarde alguns minutos antes de tentar novamente.';
  }
  if (code.includes('user already registered')) {
    return 'Este e-mail já está cadastrado no sistema. Tente fazer o login.';
  }
  if (code.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (code.includes('password should be at least 6 characters')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (code.includes('email not confirmed') || code.includes('email link is invalid or has expired')) {
    return 'Verifique sua caixa de e-mail e clique no link de confirmação para acessar.';
  }
  if (code.includes('network error') || code.includes('failed to fetch')) {
    return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
  }
  if (code.includes('weak_password')) {
    return 'Esta senha é muito fraca. Tente uma combinação mais forte de letras e números.';
  }
  
  // Retorno genérico seguro (não exibe o texto bruto em inglês para o usuário final)
  return 'Ocorreu um erro na requisição. Verifique os dados e tente novamente.';
}
