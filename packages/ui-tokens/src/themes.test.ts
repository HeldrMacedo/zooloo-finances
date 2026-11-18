import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme, themeToCssVariables } from './themes.js';

describe('themes', () => {
  it('gera variáveis CSS com prefixo --zl- em kebab-case', () => {
    const css = themeToCssVariables(lightTheme);
    expect(css).toContain('--zl-background: #F8FAF8;');
    expect(css).toContain('--zl-text-muted: #5B6B77;');
    expect(css).toContain('--zl-nav-active-text: #142B3B;');
  });

  it('os dois temas têm as mesmas chaves', () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(lightTheme).sort());
  });

  it('receita e despesa nunca usam o Teal da marca (RNF-UX-02)', () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect([theme.income, theme.expense]).not.toContain('#16B89A');
    }
  });
});
