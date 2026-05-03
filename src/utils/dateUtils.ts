import { APP_CONFIG } from '../config/appConfig';

export const getBimestrePorData = (dataStr: string): string => {
  if (!dataStr) return '';

  let dia, mes, ano;
  if (dataStr.includes('/')) {
    [dia, mes, ano] = dataStr.split('/').map(Number);
  } else {
    [ano, mes, dia] = dataStr.split('-').map(Number);
  }
  
  if (!dia || !mes || !ano) return '';
  const dataRef = new Date(ano, mes - 1, dia);

  const periodo = APP_CONFIG.PERIODOS.find(p => {
    const start = new Date(p.dataInicio);
    const end = new Date(p.dataFim);
    return dataRef >= start && dataRef <= end;
  });

  return periodo ? periodo.nome : '';
};
export const getDayOfWeek = (dataStr: string): number => {
  if (!dataStr) return -1;
  let dia, mes, ano;
  if (dataStr.includes('/')) {
    [dia, mes, ano] = dataStr.split('/').map(Number);
  } else {
    [ano, mes, dia] = dataStr.split('-').map(Number);
  }
  if (!dia || !mes || !ano) return -1;
  return new Date(ano, mes - 1, dia).getDay();
};

export const formatarDataParaISO = (dataStr: string): string => {
  if (!dataStr) return '';
  if (dataStr.includes('-')) return dataStr; // Já está no formato ISO
  const [dia, mes, ano] = dataStr.split('/');
  if (!dia || !mes || !ano) return dataStr;
  return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
};
