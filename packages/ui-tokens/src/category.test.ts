import { describe, expect, it } from 'vitest';
import {
  CATEGORY_COLOR_KEYS,
  categoryColor,
  categoryColorKey,
  categoryIconColor,
} from './category.js';
import { contrastRatio } from './contrast.js';
import { color } from './tokens.js';

const cases = CATEGORY_COLOR_KEYS.map((key) => ({ key, ...categoryColor[key] }));

describe('cores de categoria (doc 13 §2.5)', () => {
  it.each(cases)('$key: ícone sobre o selo ≥ 4,5:1 nos dois temas', ({ light, dark }) => {
    expect(contrastRatio(categoryIconColor.light, light)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(categoryIconColor.dark, dark)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(cases)('$key: selo sobre o card ≥ 3:1 nos dois temas', ({ light, dark }) => {
    expect(contrastRatio(light, color['sand-50'])).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(dark, color['midnight-800'])).toBeGreaterThanOrEqual(3);
  });

  it('as cores gravadas são distintas e em maiúsculas (#RRGGBB)', () => {
    const stored = cases.map(({ light }) => light);
    expect(new Set(stored).size).toBe(stored.length);
    for (const hex of stored) {
      expect(hex).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('acha a chave pelo hex gravado, sem diferenciar maiúsculas; fora da paleta vira Ardósia', () => {
    expect(categoryColorKey('#2d6e85')).toBe('teal');
    expect(categoryColorKey('#A83C64')).toBe('rose');
    expect(categoryColorKey('#123456')).toBe('slate');
  });
});
