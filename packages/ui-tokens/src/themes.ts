import { color } from './tokens.js';

export interface Theme {
  readonly background: string;
  readonly sidebar: string;
  readonly surface: string;
  readonly surfaceMuted: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly text: string;
  readonly textMuted: string;
  readonly navActive: string;
  readonly navActiveText: string;
  readonly primary: string;
  readonly primaryText: string;
  /** Cor de destaque para elementos gráficos (anéis, barras, ícones); texto usa `link`. */
  readonly accent: string;
  readonly link: string;
  readonly income: string;
  readonly expense: string;
  readonly warning: string;
  readonly warningText: string;
  readonly info: string;
}

/** Tema claro (doc 13 §5.1): fundo Sand, menu Sand-200, cards Sand-50, item ativo Midnight. */
export const lightTheme: Theme = {
  background: color.sand,
  sidebar: color['sand-200'],
  surface: color['sand-50'],
  surfaceMuted: color['sand-100'],
  border: color['sand-300'],
  borderStrong: color['sand-400'],
  text: color.midnight,
  textMuted: color['text-muted'],
  navActive: color.midnight,
  navActiveText: color.white,
  primary: color.midnight,
  primaryText: color.white,
  accent: color.teal,
  link: color.teal,
  income: color.income.light,
  expense: color.expense.light,
  warning: color.sun,
  warningText: color['midnight-900'],
  info: color.teal,
};

/** Tema escuro (doc 13 §2.2): página Midnight-950, cards Midnight-800, item ativo Ice. */
export const darkTheme: Theme = {
  background: color['midnight-950'],
  sidebar: color['midnight-900'],
  surface: color['midnight-800'],
  surfaceMuted: color['midnight-700'],
  border: color['midnight-600'],
  borderStrong: color['midnight-500'],
  text: color.cloud,
  textMuted: color['text-muted-dark'],
  navActive: color.ice,
  navActiveText: color['midnight-900'],
  primary: color.ice,
  primaryText: color['midnight-900'],
  accent: color['teal-400'],
  link: color['teal-300'],
  income: color.income.dark,
  expense: color.expense.dark,
  warning: color.sun,
  warningText: color['midnight-900'],
  info: color['teal-300'],
};

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** Variáveis CSS `--zl-*` de um tema, para `:root` ou `[data-theme]`. */
export function themeToCssVariables(theme: Theme): string {
  return Object.entries(theme)
    .map(([key, value]) => `--zl-${kebabCase(key)}: ${value};`)
    .join('\n');
}
