import { color } from './tokens.js';

export interface Theme {
  readonly background: string;
  readonly surface: string;
  readonly text: string;
  readonly textMuted: string;
  readonly topbar: string;
  readonly topbarText: string;
  readonly navActive: string;
  readonly navActiveText: string;
  readonly primary: string;
  readonly primaryText: string;
  readonly link: string;
  readonly income: string;
  readonly expense: string;
  readonly warning: string;
  readonly warningText: string;
  readonly info: string;
}

/** Tema claro (doc 13 §5.1): topbar Midnight, conteúdo Warm White, cards brancos. */
export const lightTheme: Theme = {
  background: color['warm-white'],
  surface: color.surface,
  text: color.midnight,
  textMuted: color['text-muted'],
  topbar: color.midnight,
  topbarText: color.white,
  navActive: color.mint,
  navActiveText: color.midnight,
  primary: color['teal-700'],
  primaryText: color.white,
  link: color['teal-700'],
  income: color.income.light,
  expense: color.expense.light,
  warning: color.sun,
  warningText: color.midnight,
  info: color['teal-700'],
};

/** Tema escuro (doc 13 §2.2): página Midnight-900, cards Midnight. */
export const darkTheme: Theme = {
  background: color['midnight-900'],
  surface: color.midnight,
  text: color.white,
  textMuted: color['text-muted-dark'],
  topbar: color['midnight-900'],
  topbarText: color.white,
  navActive: color.midnight,
  navActiveText: color.teal,
  primary: color['teal-700'],
  primaryText: color.white,
  link: color.teal,
  income: color.income.dark,
  expense: color.expense.dark,
  warning: color.sun,
  warningText: color.midnight,
  info: color.teal,
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
