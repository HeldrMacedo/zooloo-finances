import { chartSequence, chartSequenceDark, darkTheme, lightTheme } from '@zooloo/ui-tokens';
import { describe, expect, it } from 'vitest';
import { TOKENS_MODULE_ID, tokensCss, zoolooTokensPlugin } from './tokens-css.ts';

describe('tokensCss', () => {
  const css = tokensCss();

  it('tema claro em :root e escuro por atributo e por preferência do sistema', () => {
    expect(css).toContain(`--zl-background: ${lightTheme.background};`);
    expect(css).toContain(`:root[data-theme='dark'] {`);
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain(':root:not([data-theme])');
    expect(css.split(`--zl-background: ${darkTheme.background};`)).toHaveLength(3);
  });

  it('cores de gráfico por tema', () => {
    expect(css).toContain(`--zl-chart-1: ${chartSequence[0]};`);
    expect(css.split(`--zl-chart-1: ${chartSequenceDark[0]};`)).toHaveLength(3);
  });

  it('fontes, raios, escala e cores da marca', () => {
    expect(css).toContain("--zl-font-display: 'Plus Jakarta Sans Variable'");
    expect(css).toContain("--zl-font-ui: 'Inter Variable'");
    expect(css).toContain('--zl-radius-lg: 16px;');
    expect(css).toContain('--zl-text-md: 1rem;');
    expect(css).toContain('--zl-brand-teal: #2D6E85;');
    // Tokens compostos (income/expense) ficam só nos temas.
    expect(css).not.toContain('--zl-brand-income');
  });
});

describe('zoolooTokensPlugin', () => {
  it('resolve e carrega só o módulo virtual', () => {
    const plugin = zoolooTokensPlugin();
    const resolved = plugin.resolveId(TOKENS_MODULE_ID);
    expect(resolved).toBe(`\0${TOKENS_MODULE_ID}`);
    expect(plugin.load(resolved ?? '')).toBe(tokensCss());
    expect(plugin.resolveId('outro')).toBeUndefined();
    expect(plugin.load('outro')).toBeUndefined();
  });
});
