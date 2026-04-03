
export const getBimestrePorData = (dataStr: string): string => {
  if (!dataStr) return '';

  // Espera DD/MM/YYYY
  const [dia, mes, ano] = dataStr.split('/').map(Number);
  const data = new Date(ano, mes - 1, dia);

  // Datas de 2026
  if (data <= new Date(2026, 3, 23)) return '1º Bimestre';
  if (data <= new Date(2026, 6, 7)) return '2º Bimestre';
  if (data <= new Date(2026, 8, 24)) return '3º Bimestre';
  return '4º Bimestre';
};
export const getDayOfWeek = (dataStr: string): number => {
  if (!dataStr) return -1;
  const [dia, mes, ano] = dataStr.split('/').map(Number);
  return new Date(ano, mes - 1, dia).getDay();
};
