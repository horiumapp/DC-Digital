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
