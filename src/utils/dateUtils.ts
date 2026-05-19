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
    // FIX: usar parsing manual para evitar bug de timezone (UTC-3)
    const [sy, sm, sd] = p.dataInicio.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const [ey, em, ed] = p.dataFim.split('-').map(Number);
    const end = new Date(ey, em - 1, ed);
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

export const formatarDataParaExibicao = (dataStr: string): string => {
  if (!dataStr) return '';
  if (dataStr.includes('/')) return dataStr; // Já está no formato brasileiro
  const [ano, mes, dia] = dataStr.split('-');
  if (!dia || !mes || !ano) return dataStr;
  return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
};
