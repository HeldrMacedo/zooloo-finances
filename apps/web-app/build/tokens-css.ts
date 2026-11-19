import {
  chartSequence,
  chartSequenceDark,
  color,
  darkTheme,
  font,
  fontSize,
  lightTheme,
  radius,
  themeToCssVariables,
} from '@zooloo/ui-tokens';

const indent = (block: string): string =>
  block
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

/**
 * CSS das variáveis `--zl-*` gerado de `@zooloo/ui-tokens` no build (doc 13 §6). Folha estática:
 * a CSP do app não precisa liberar estilo inline. Tema claro em `:root`, escuro em
 * `[data-theme='dark']` e, sem escolha explícita, pela preferência do sistema.
 */
export function tokensCss(): string {
  const shared = [
    `--zl-font-display: '${font.display} Variable', ${font.fallback};`,
    `--zl-font-ui: '${font.ui} Variable', ${font.fallback};`,
    // Cores da marca sem tema, para o símbolo e elementos que não mudam com o tema.
    ...Object.entries(color).flatMap(([key, value]) =>
      typeof value === 'string' ? [`--zl-brand-${key}: ${value};`] : [],
    ),
    ...Object.entries(radius).map(([key, value]) => `--zl-radius-${key}: ${value}px;`),
    ...Object.entries(fontSize).map(([key, value]) => `--zl-text-${key}: ${value / 16}rem;`),
  ].join('\n');
  const chart = (sequence: readonly string[]): string =>
    sequence.map((value, index) => `--zl-chart-${index + 1}: ${value};`).join('\n');
  const light = `${themeToCssVariables(lightTheme)}\n${chart(chartSequence)}`;
  const dark = `${themeToCssVariables(darkTheme)}\n${chart(chartSequenceDark)}`;
  return [
    `:root {\n${indent(shared)}\n${indent(light)}\n  color-scheme: light;\n}`,
    `:root[data-theme='dark'] {\n${indent(dark)}\n  color-scheme: dark;\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${indent(indent(dark))}\n    color-scheme: dark;\n  }\n}`,
  ].join('\n\n');
}

export const TOKENS_MODULE_ID = 'virtual:zooloo-tokens.css';

/** Plugin do Vite que expõe `import 'virtual:zooloo-tokens.css'`. */
export function zoolooTokensPlugin() {
  const resolved = `\0${TOKENS_MODULE_ID}`;
  return {
    name: 'zooloo-tokens',
    resolveId: (id: string) => (id === TOKENS_MODULE_ID ? resolved : undefined),
    load: (id: string) => (id === resolved ? tokensCss() : undefined),
  };
}
