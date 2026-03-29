
export const getBimestrePorData = (dataStr: string): string => {
  if (!dataStr) return '1º Bimestre';

  // Espera DD/MM/YYYY
  const [dia, mes, ano] = dataStr.split('/').map(Number);
  const data = new Date(ano, mes - 1, dia);

  // Datas de 2026
  if (data <= new Date(2026, 3, 23)) return '1º Bimestre';
  if (data <= new Date(2026, 6, 7)) return '2º Bimestre';
  if (data <= new Date(2026, 8, 24)) return '3º Bimestre';
  return '4º Bimestre';
};

export const formatCurrencyBRL = (val: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};
