import { color } from './tokens.js';

/**
 * Paleta fixa de cores de categoria (doc 13 §2.5). Altere lá antes de alterar aqui.
 * O hex gravado é o do tema claro; o escuro troca pelo par da mesma chave.
 */
export const categoryColor = {
  teal: { light: '#2D6E85', dark: '#78A5B0' },
  midnight: { light: '#16324A', dark: '#C7D8E2' },
  terracotta: { light: '#AD4621', dark: '#EA8461' },
  green: { light: '#18744C', dark: '#80ED99' },
  amber: { light: '#8A5A00', dark: '#E59934' },
  purple: { light: '#6B4C9A', dark: '#B9A2E0' },
  rose: { light: '#A83C64', dark: '#E89AB5' },
  blue: { light: '#2F5FA8', dark: '#8FB3E8' },
  slate: { light: '#5B6B77', dark: '#94A3B8' },
} as const;

export type CategoryColorKey = keyof typeof categoryColor;

export const CATEGORY_COLOR_KEYS = Object.keys(categoryColor) as CategoryColorKey[];

/** Cor do ícone dentro do selo da categoria, por tema. */
export const categoryIconColor = { light: color.white, dark: color['midnight-900'] } as const;

/** Chave da paleta para um hex gravado; fora da paleta vira Ardósia (doc 13 §2.5). */
export function categoryColorKey(hex: string): CategoryColorKey {
  const upper = hex.toUpperCase();
  return CATEGORY_COLOR_KEYS.find((key) => categoryColor[key].light === upper) ?? 'slate';
}
