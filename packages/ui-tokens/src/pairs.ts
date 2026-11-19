import { darkTheme, lightTheme, type Theme } from './themes.js';
import { color } from './tokens.js';

export interface ColorPair {
  readonly name: string;
  readonly foreground: string;
  readonly background: string;
}

function themeTextPairs(label: string, theme: Theme): ColorPair[] {
  const backgrounds = [
    ['fundo', theme.background],
    ['menu', theme.sidebar],
    ['card', theme.surface],
    ['subcard', theme.surfaceMuted],
  ] as const;
  return [
    ...backgrounds.flatMap(([where, background]) => [
      { name: `${label}: texto/${where}`, foreground: theme.text, background },
      { name: `${label}: secundário/${where}`, foreground: theme.textMuted, background },
      { name: `${label}: link/${where}`, foreground: theme.link, background },
      { name: `${label}: receita/${where}`, foreground: theme.income, background },
      { name: `${label}: despesa/${where}`, foreground: theme.expense, background },
    ]),
    { name: `${label}: menu ativo`, foreground: theme.navActiveText, background: theme.navActive },
    { name: `${label}: botão primário`, foreground: theme.primaryText, background: theme.primary },
    { name: `${label}: aviso`, foreground: theme.warningText, background: theme.warning },
    { name: `${label}: info/card`, foreground: theme.info, background: theme.surface },
  ];
}

/** Todo par texto/fundo usado pelos temas precisa de contraste ≥ 4,5:1 (RNF-UX-01). */
export const TEXT_PAIRS: readonly ColorPair[] = [
  ...themeTextPairs('claro', lightTheme),
  ...themeTextPairs('escuro', darkTheme),
  { name: 'branco/Midnight', foreground: color.white, background: color.midnight },
  { name: 'branco/Teal', foreground: color.white, background: color.teal },
  { name: 'Midnight-900/Sun', foreground: color['midnight-900'], background: color.sun },
];

/** Pares proibidos para texto (doc 13 §2.3): servem só para ícones, barras e bordas. */
export const GRAPHIC_ONLY_PAIRS: readonly ColorPair[] = [
  { name: 'Midnight/Teal', foreground: color.midnight, background: color.teal },
  { name: 'Sun/Sand-50', foreground: color.sun, background: color['sand-50'] },
  {
    name: 'Teal-400/Midnight-800',
    foreground: color['teal-400'],
    background: color['midnight-800'],
  },
];
