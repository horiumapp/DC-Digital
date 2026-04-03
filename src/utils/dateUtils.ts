
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
  const dataRef = new Date(ano, mes - 1, dia);
  if (ano !== 2026) return '';

  if (dataRef >= new Date(2026, 1, 5) && dataRef <= new Date(2026, 3, 23)) return '1º Bimestre';
  if (dataRef >= new Date(2026, 3, 24) && dataRef <= new Date(2026, 6, 7)) return '2º Bimestre';
  if (dataRef >= new Date(2026, 6, 16) && dataRef <= new Date(2026, 8, 24)) return '3º Bimestre';
  if (dataRef >= new Date(2026, 8, 25) && dataRef <= new Date(2026, 11, 14)) return '4º Bimestre';
  
  return '';
};
export const getDayOfWeek = (dataStr: string): number => {
  if (!dataStr) return -1;
  const [dia, mes, ano] = dataStr.split('/').map(Number);
  return new Date(ano, mes - 1, dia).getDay();
};

export const formatarDataParaISO = (dataStr: string): string => {
  if (!dataStr) return '';
  if (dataStr.includes('-')) return dataStr; // Já está no formato ISO
  const [dia, mes, ano] = dataStr.split('/');
  if (!dia || !mes || !ano) return dataStr;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
};
