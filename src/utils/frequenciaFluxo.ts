/** Depois de gravar um tempo, segue para a chamada que falta ou para o conteúdo do dia. */
export function proximoPassoAposFrequencia(
  tempos: string[],
  tempoAtual: string,
  lancamentos: { data: string; tempo: string; tipo: string }[],
  data: string
): { tipo: 'proximo-tempo'; tempo: string } | { tipo: 'conteudo' } {
  const pendente = tempos.find(tempo =>
    tempo !== tempoAtual && !lancamentos.some(item => item.data === data && item.tempo === tempo && item.tipo === 'frequencia')
  );
  return pendente ? { tipo: 'proximo-tempo', tempo: pendente } : { tipo: 'conteudo' };
}
