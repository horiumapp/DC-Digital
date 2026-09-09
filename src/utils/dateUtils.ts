import { APP_CONFIG } from '../config/appConfig';

export const getPeriodoInfoPorData = (dataStr: string) => {
  if (!dataStr) return null;

  let dia: number, mes: number, ano: number;
  if (dataStr.includes('/')) {
    [dia, mes, ano] = dataStr.split('/').map(Number);
  } else {
    [ano, mes, dia] = dataStr.split('-').map(Number);
  }
  
  if (!dia || !mes || !ano) return null;
  const dataRef = new Date(ano, mes - 1, dia);

  const found = APP_CONFIG.PERIODOS.find(p => {
    // FIX: usar parsing manual para evitar bug de timezone (UTC-3)
    const [sy, sm, sd] = p.dataInicio.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const [ey, em, ed] = p.dataFim.split('-').map(Number);
    const end = new Date(ey, em - 1, ed);
    return dataRef >= start && dataRef <= end;
  });

  if (!found) return null;
  const numMatch = found.id.match(/^[1-4]/);
  return {
    ...found,
    numero: numMatch ? parseInt(numMatch[0], 10) : null,
  };
};

export const getBimestrePorData = (dataStr: string): string => {
  const periodo = getPeriodoInfoPorData(dataStr);
  return periodo ? periodo.nome : '';
};

export const getBimestreNumero = (dateOrBimestre: string): number | null => {
  if (!dateOrBimestre) return null;
  const trimmed = dateOrBimestre.trim();

  // Se for data (YYYY-MM-DD ou DD/MM/YYYY)
  if (trimmed.includes('-') || trimmed.includes('/')) {
    const periodo = getPeriodoInfoPorData(trimmed);
    if (periodo && periodo.numero !== null) {
      return periodo.numero;
    }
    return null;
  }

  // Se for string de bimestre (ex: '1º Bimestre', '1. BIMESTRE', '1', 'Bimestre 1')
  const match = trimmed.match(/^[1-4]/) || trimmed.match(/([1-4])(?:º|\.|o|°|\s|$)/);
  if (match) {
    return parseInt(match[1] || match[0], 10);
  }

  return null;
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
