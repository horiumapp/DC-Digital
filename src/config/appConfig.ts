
export const APP_CONFIG = {
  YEAR: 2026,
  BIMESTRES: [
    { id: 1, nome: '1º Bimestre', label: '1. BIMESTRE', dataInicio: '2026-02-05', dataFim: '2026-04-23', months: 'Fev, Mar, Abr' },
    { id: 2, nome: '2º Bimestre', label: '2. BIMESTRE', dataInicio: '2026-04-24', dataFim: '2026-07-07', months: 'Abr, Mai, Jun, Jul' },
    { id: 3, nome: '3º Bimestre', label: '3. BIMESTRE', dataInicio: '2026-07-16', dataFim: '2026-09-24', months: 'Jul, Ago, Set' },
    { id: 4, nome: '4º Bimestre', label: '4. BIMESTRE', dataInicio: '2026-09-25', dataFim: '2026-12-14', months: 'Set, Out, Nov, Dez' },
  ],
  VERSION: '1.0.0'
};

export const getBimestreAtual = (date: Date = new Date()) => {
  return APP_CONFIG.BIMESTRES.find(b => {
    const start = new Date(b.dataInicio);
    const end = new Date(b.dataFim);
    return date >= start && date <= end;
  });
};
