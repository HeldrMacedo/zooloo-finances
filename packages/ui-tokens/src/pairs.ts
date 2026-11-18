import { darkTheme, lightTheme, type Theme } from './themes.js';
import { color } from './tokens.js';

export interface ColorPair {
  readonly name: string;
  readonly foreground: string;
  readonly background: string;
}

function themeTextPairs(label: string, theme: Theme): ColorPair[] {
  return [
    { name: `${label}: texto/fundo`, foreground: theme.text, background: theme.background },
    { name: `${label}: texto/card`, foreground: theme.text, background: theme.surface },
    {
      name: `${label}: secundário/fundo`,
      foreground: theme.textMuted,
      background: theme.background,
    },
    { name: `${label}: secundário/card`, foreground: theme.textMuted, background: theme.surface },
    { name: `${label}: topbar`, foreground: theme.topbarText, background: theme.topbar },
    { name: `${label}: menu ativo`, foreground: theme.navActiveText, background: theme.navActive },
    { name: `${label}: botão primário`, foreground: theme.primaryText, background: theme.primary },
    { name: `${label}: link/card`, foreground: theme.link, background: theme.surface },
    { name: `${label}: receita/card`, foreground: theme.income, background: theme.surface },
    { name: `${label}: despesa/card`, foreground: theme.expense, background: theme.surface },
    { name: `${label}: aviso`, foreground: theme.warningText, background: theme.warning },
    { name: `${label}: info/card`, foreground: theme.info, background: theme.surface },
  ];
}

/** Todo par texto/fundo usado pelos temas precisa de contraste ≥ 4,5:1 (RNF-UX-01). */
export const TEXT_PAIRS: readonly ColorPair[] = [
  ...themeTextPairs('claro', lightTheme),
  ...themeTextPairs('escuro', darkTheme),
  { name: 'Midnight/Mint', foreground: color.midnight, background: color.mint },
  { name: 'Midnight/Teal', foreground: color.midnight, background: color.teal },
  { name: 'Teal/Midnight', foreground: color.teal, background: color.midnight },
];

/** Pares proibidos para texto (doc 13 §2.3): servem só para ícones, barras e bordas. */
export const GRAPHIC_ONLY_PAIRS: readonly ColorPair[] = [
  { name: 'branco/Teal', foreground: color.white, background: color.teal },
  { name: 'Teal/branco', foreground: color.teal, background: color.surface },
  { name: 'Teal/Warm White', foreground: color.teal, background: color['warm-white'] },
  { name: 'Sun/branco', foreground: color.sun, background: color.surface },
];
