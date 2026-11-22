type LancamentoFluxo = { data: string; tempo: string; tipo: string };

/** Indica se o tempo já tem frequência lançada na data. */
export function tempoTemFrequencia(
  data: string,
  tempo: string,
  lancamentos: LancamentoFluxo[]
): boolean {
  return lancamentos.some(
    item => item.data === data && item.tempo === tempo && item.tipo === 'frequencia'
  );
}

/** Depois de gravar um tempo, segue para a chamada que falta ou para o conteúdo do dia. */
export function proximoPassoAposFrequencia(
  tempos: string[],
  tempoAtual: string,
  lancamentos: LancamentoFluxo[],
  data: string
): { tipo: 'proximo-tempo'; tempo: string } | { tipo: 'conteudo' } {
  const pendente = tempos.find(tempo =>
    tempo !== tempoAtual && !tempoTemFrequencia(data, tempo, lancamentos)
  );
  return pendente ? { tipo: 'proximo-tempo', tempo: pendente } : { tipo: 'conteudo' };
}
