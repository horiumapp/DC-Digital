import { describe, expect, it } from 'vitest';
import { getEscolaLogo, LOGO_PADRAO_SEMED } from '../utils/escolaUtils';

describe('Logo da escola nos relatórios', () => {
  it('resolve Centro Esperança pelo nome (mesmo padrão do dashboard)', () => {
    expect(getEscolaLogo({ nome: 'Centro Esperança de Lábrea' })).toBe('/Centro_Esperança.png');
  });

  it('prioriza logo_url cadastrado sobre o mapa por nome', () => {
    expect(
      getEscolaLogo({
        nome: 'Centro Esperança de Lábrea',
        logo_url: 'https://cdn.example/escola.png',
      })
    ).toBe('https://cdn.example/escola.png');
  });

  it('usa SEMED quando não há logo_url nem correspondência por nome', () => {
    expect(getEscolaLogo({ nome: 'Escola Horizonte' })).toBe(LOGO_PADRAO_SEMED);
  });
});
