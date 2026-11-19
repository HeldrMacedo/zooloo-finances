import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHexColor } from './contrast.js';
import { GRAPHIC_ONLY_PAIRS, TEXT_PAIRS } from './pairs.js';

describe('contrastRatio (WCAG 2.1)', () => {
  it('preto sobre branco = 21:1 e cor sobre ela mesma = 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#2D6E85', '#2D6E85')).toBeCloseTo(1, 5);
  });

  it('é simétrica', () => {
    expect(contrastRatio('#16324A', '#E59934')).toBeCloseTo(
      contrastRatio('#E59934', '#16324A'),
      10,
    );
  });

  it('confere os valores do doc 13 §2.3', () => {
    expect(contrastRatio('#16324A', '#F5F1EB')).toBeCloseTo(11.7, 1);
    expect(contrastRatio('#FFFFFF', '#2D6E85')).toBeCloseTo(5.7, 1);
    expect(contrastRatio('#16324A', '#2D6E85')).toBeCloseTo(2.3, 1);
  });

  it('recusa cor fora do formato #RRGGBB', () => {
    expect(() => parseHexColor('#FFF')).toThrow(/#RRGGBB/);
    expect(() => parseHexColor('teal')).toThrow(/#RRGGBB/);
  });
});

describe('pares de tokens (doc 13 §6, RNF-UX-01)', () => {
  it.each(TEXT_PAIRS)('texto $name tem contraste ≥ 4,5:1', ({ foreground, background }) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(GRAPHIC_ONLY_PAIRS)(
    'par $name fica abaixo de 4,5:1 e por isso só vale para elementos gráficos',
    ({ foreground, background }) => {
      expect(contrastRatio(foreground, background)).toBeLessThan(4.5);
    },
  );
});
