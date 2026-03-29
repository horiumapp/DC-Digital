export const formatCpfObscured = (cpf: string) => {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9, 11)}`;
};

export const formatMatricula = (id: string | number) => {
  if (!id) return '---';
  const onlyNums = id.toString().replace(/[^0-9]/g, '');
  // Se não houver números no UUID, usamos um fallback baseado no hash ou apenas o ano
  const numericPart = onlyNums.length >= 7 
    ? onlyNums.substring(0, 7) 
    : onlyNums.padEnd(7, '0');
  
  return `2026 / ${numericPart}`;
};
