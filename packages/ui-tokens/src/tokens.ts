/** Fonte: docs/product-specs/13-identidade_visual.md §2 e §6. Altere lá antes de alterar aqui. */
export const color = {
  midnight: '#142B3B',
  'midnight-900': '#0F1F2B',
  teal: '#16B89A',
  'teal-700': '#0B7A66',
  sun: '#FFC857',
  mint: '#E8F7F2',
  'warm-white': '#F8FAF8',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  'text-muted': '#5B6B77',
  'text-muted-dark': '#9FB3C1',
  orange: '#F47C3C',
  income: { light: '#15803D', dark: '#4ADE80' },
  expense: { light: '#B91C1C', dark: '#F87171' },
} as const;

/** Sequência de cores de gráficos (doc 13 §2.4), sempre com legenda textual. */
export const chartSequence = [
  color.teal,
  color.midnight,
  color.sun,
  color.orange,
  color.mint,
  color['text-muted-dark'],
] as const;

/** Raios em px (doc 13 §4 e §6). */
export const radius = { sm: 8, md: 12, lg: 16 } as const;

export const font = {
  display: 'Plus Jakarta Sans',
  ui: 'Inter',
  kids: 'Nunito',
  fallback: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/** Escala tipográfica em px (doc 13 §3). */
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 40 } as const;

export const lineHeight = { body: 1.5, heading: 1.2 } as const;
