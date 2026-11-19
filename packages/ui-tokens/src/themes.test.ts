import { describe, expect, it } from 'vitest';
import { darkTheme, lightTheme, themeToCssVariables } from './themes.js';
import { color } from './tokens.js';

describe('themes', () => {
  it('gera variáveis CSS com prefixo --zl- em kebab-case', () => {
    const css = themeToCssVariables(lightTheme);
    expect(css).toContain('--zl-background: #F5F1EB;');
    expect(css).toContain('--zl-text-muted: #5A6874;');
    expect(css).toContain('--zl-nav-active-text: #FFFFFF;');
    expect(css).toContain('--zl-surface-muted: #F1ECE3;');
  });

  it('os dois temas têm as mesmas chaves', () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(lightTheme).sort());
  });

  it('receita e despesa nunca usam o Teal da marca (RNF-UX-02)', () => {
    for (const theme of [lightTheme, darkTheme]) {
      expect([theme.income, theme.expense]).not.toContain(color.teal);
      expect([theme.income, theme.expense]).not.toContain(color['teal-400']);
    }
  });
});
