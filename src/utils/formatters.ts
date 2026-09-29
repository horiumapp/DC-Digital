export const formatCpfObscured = (cpf: string) => {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
};


/**
 * @deprecated Use formatMatriculaCpf instead. Kept for backwards compatibility.
 */
export const formatMatricula = (id: string | number, cpf?: string | null): string => {
  if (cpf) {
    return formatMatriculaCpf(cpf);
  }
  return 'CPF Pendente';
};

/**
 * Formata o CPF do aluno como matrícula para exibição: 000.000.000-00
 */
export const formatMatriculaCpf = (cpf: string): string => {
  if (!cpf) return 'CPF Pendente';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9, 11)}`;
  }
  // CPF parcial — exibir os dígitos que tem
  return cleaned || 'CPF Pendente';
};

/**
 * Retorna apenas os dígitos do CPF para uso como login (pseudo-email).
 */
export const getMatriculaLogin = (cpf: string): string => {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
};

/**
 * Gera uma senha temporária forte (letras + números, sem caracteres ambíguos).
 * FIX C2: substitui senhas padrão previsíveis ("Aluno2026", "@prof123") que eram
 * usadas em massa e permitiam acesso indevido às contas.
 */
export const gerarSenhaTemporaria = (length = 12): string => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = uppercase + lowercase + digits;

  const values = new Uint32Array(length);
  crypto.getRandomValues(values);

  const chars: string[] = [];
  for (let i = 0; i < length; i++) {
    chars.push(all[values[i] % all.length]);
  }

  // Garantir pelo menos uma letra maiúscula, uma minúscula e um número
  chars[0] = uppercase[values[0] % uppercase.length];
  chars[1] = lowercase[values[1] % lowercase.length];
  chars[2] = digits[values[2] % digits.length];

  // Embaralhar para não deixar os caracteres garantidos nas posições fixas
  for (let i = chars.length - 1; i > 0; i--) {
    const j = values[(i + 3) % values.length] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
};
