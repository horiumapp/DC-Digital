export const APP_CONFIG = {
  YEAR: 2026,
  PERIODOS: [
    { id: '1. BIMESTRE', nome: '1º Bimestre', dataInicio: '2026-02-05', dataFim: '2026-04-23' },
    { id: '2. BIMESTRE', nome: '2º Bimestre', dataInicio: '2026-04-24', dataFim: '2026-07-07' },
    { id: '3. BIMESTRE', nome: '3º Bimestre', dataInicio: '2026-07-16', dataFim: '2026-09-24' },
    { id: '4. BIMESTRE', nome: '4º Bimestre', dataInicio: '2026-09-25', dataFim: '2026-12-14' },
    { id: '1. SEMESTRE', nome: '1º Semestre', dataInicio: '2026-02-05', dataFim: '2026-07-07' },
    { id: '2. SEMESTRE', nome: '2º Semestre', dataInicio: '2026-07-16', dataFim: '2026-12-14' },
    { id: 'ÚNICO', nome: 'Período Único', dataInicio: '2026-02-05', dataFim: '2026-12-14' },
    { id: 'RECUPERAÇÃO', nome: 'Recuperação Final', dataInicio: '2026-12-15', dataFim: '2026-12-23' },
  ],
  VERSION: '1.0.0'
};

export const getPeriodoPorData = (date: Date = new Date()) => {
  return APP_CONFIG.PERIODOS.find(p => {
    const start = new Date(p.dataInicio);
    const end = new Date(p.dataFim);
    return date >= start && date <= end;
  });
};
