export interface PeriodoLetivo {
  id: string;
  nome: string;
  label: string;
  dataInicio: string;
  dataFim: string;
}

/**
 * Converte uma string 'YYYY-MM-DD' em um objeto Date no horário local,
 * evitando o bug de timezone onde datas ISO são interpretadas como UTC
 * (o que causaria deslocamento de 1 dia para usuários no fuso UTC-3/Brasil).
 */
const isoParaDataLocal = (isoStr: string): Date => {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const APP_CONFIG = {
  /** Ano letivo vigente. Configurável via VITE_ANO_LETIVO no .env */
  YEAR: parseInt(import.meta.env.VITE_ANO_LETIVO || '2026'),
  PERIODOS: [
    { id: '1. BIMESTRE', nome: '1º Bimestre', label: '1. BIMESTRE', dataInicio: '2026-02-05', dataFim: '2026-04-23' },
    { id: '2. BIMESTRE', nome: '2º Bimestre', label: '2. BIMESTRE', dataInicio: '2026-04-24', dataFim: '2026-07-07' },
    { id: '3. BIMESTRE', nome: '3º Bimestre', label: '3. BIMESTRE', dataInicio: '2026-07-16', dataFim: '2026-09-24' },
    { id: '4. BIMESTRE', nome: '4º Bimestre', label: '4. BIMESTRE', dataInicio: '2026-09-25', dataFim: '2026-12-14' },
    { id: '1. SEMESTRE', nome: '1º Semestre', label: '1. SEMESTRE', dataInicio: '2026-02-05', dataFim: '2026-07-07' },
    { id: '2. SEMESTRE', nome: '2º Semestre', label: '2. SEMESTRE', dataInicio: '2026-07-16', dataFim: '2026-12-14' },
    { id: 'ÚNICO', nome: 'Período Único', label: 'ÚNICO', dataInicio: '2026-02-05', dataFim: '2026-12-14' },
    { id: 'RECUPERAÇÃO', nome: 'Recuperação Final', label: 'RECUPERAÇÃO', dataInicio: '2026-12-15', dataFim: '2026-12-23' },
  ],
  VERSION: '1.0.0'
};

export const getPeriodoPorData = (date: Date | string = new Date()) => {
  const dataRef = typeof date === 'string' ? isoParaDataLocal(date) : date;
  return APP_CONFIG.PERIODOS.find(p => {
    // BUG-04 FIX: usar isoParaDataLocal para evitar deslocamento de timezone
    const start = isoParaDataLocal(p.dataInicio);
    const end = isoParaDataLocal(p.dataFim);
    return dataRef >= start && dataRef <= end;
  });
};

export const getBimestreAtual = () => {
  const hoje = new Date();
  const bimestres = APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE'));
  return bimestres.find(b => {
    // BUG-04 FIX: usar isoParaDataLocal para evitar deslocamento de timezone
    const start = isoParaDataLocal(b.dataInicio);
    const end = isoParaDataLocal(b.dataFim);
    return hoje >= start && hoje <= end;
  }) || null;
};
