import { describe, expect, it } from 'vitest';
import { contrastRatio, parseHexColor } from './contrast.js';
import { GRAPHIC_ONLY_PAIRS, TEXT_PAIRS } from './pairs.js';

describe('contrastRatio (WCAG 2.1)', () => {
  it('preto sobre branco = 21:1 e cor sobre ela mesma = 1:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#16B89A', '#16B89A')).toBeCloseTo(1, 5);
  });

  it('é simétrica', () => {
    expect(contrastRatio('#142B3B', '#FFC857')).toBeCloseTo(
      contrastRatio('#FFC857', '#142B3B'),
      10,
    );
  });

  it('confere os valores do doc 13 §2.3', () => {
    expect(contrastRatio('#142B3B', '#FFFFFF')).toBeCloseTo(14.6, 1);
    expect(contrastRatio('#FFFFFF', '#0B7A66')).toBeCloseTo(5.3, 1);
    expect(contrastRatio('#FFFFFF', '#16B89A')).toBeCloseTo(2.5, 1);
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
