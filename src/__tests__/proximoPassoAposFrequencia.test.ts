import { describe, expect, it } from 'vitest';
import { proximoPassoAposFrequencia } from '../utils/frequenciaFluxo';

const tempos = ['1º TEMPO', '2º TEMPO', '5º TEMPO'];
const data = '2026-03-05';

describe('próximo passo depois de gravar a frequência', () => {
  it('abre o conteúdo quando o dia não tem mais chamada pendente', () => {
    const lancamentos = [
      { data, tempo: '1º TEMPO', tipo: 'frequencia' },
      { data, tempo: '2º TEMPO', tipo: 'frequencia' },
    ];
    expect(proximoPassoAposFrequencia(tempos, '5º TEMPO', lancamentos, data)).toEqual({ tipo: 'conteudo' });
  });

  it('segue para o tempo de frequência que ainda falta', () => {
    const lancamentos = [{ data, tempo: '1º TEMPO', tipo: 'frequencia' }];
    expect(proximoPassoAposFrequencia(tempos, '1º TEMPO', lancamentos, data)).toEqual({
      tipo: 'proximo-tempo',
      tempo: '2º TEMPO',
    });
  });
});
