
export const getBimestrePorData = (dataStr: string): string => {
  if (!dataStr) return '';

  // Espera DD/MM/YYYY ou YYYY-MM-DD
  let dia, mes, ano;
  if (dataStr.includes('/')) {
    [dia, mes, ano] = dataStr.split('/').map(Number);
  } else {
    [ano, mes, dia] = dataStr.split('-').map(Number);
  }
  
  if (!dia || !mes || !ano) return '';
  const data = new Date(ano, mes - 1, dia);

  // Datas de 2026 (Limites estritos baseados em Diario.tsx)
  // 1º Bimestre: 05/02/2026 - 23/04/2026
  if (data >= new Date(2026, 1, 5) && data <= new Date(2026, 3, 23)) return '1º Bimestre';
  // 2º Bimestre: 24/04/2026 - 07/07/2026
  if (data >= new Date(2026, 3, 24) && data <= new Date(2026, 6, 7)) return '2º Bimestre';
  // 3º Bimestre: 16/07/2026 - 24/09/2026
  if (data >= new Date(2026, 6, 16) && data <= new Date(2026, 8, 24)) return '3º Bimestre';
  // 4º Bimestre: 25/09/2026 - 14/12/2026
  if (data >= new Date(2026, 8, 25) && data <= new Date(2026, 11, 14)) return '4º Bimestre';
  
  return '';
};
export const getDayOfWeek = (dataStr: string): number => {
  if (!dataStr) return -1;
  const [dia, mes, ano] = dataStr.split('/').map(Number);
  return new Date(ano, mes - 1, dia).getDay();
};
