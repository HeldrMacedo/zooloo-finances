/** Fonte: docs/product-specs/13-identidade_visual.md §2 e §6. Altere lá antes de alterar aqui. */
export const color = {
  midnight: '#16324A',
  'midnight-950': '#0B1D2C',
  'midnight-900': '#0E2231',
  'midnight-800': '#132B3E',
  'midnight-700': '#18344B',
  'midnight-600': '#1E3D56',
  'midnight-500': '#2A506F',
  teal: '#2D6E85',
  'teal-400': '#3C849C',
  'teal-300': '#78A5B0',
  ice: '#C7D8E2',
  sun: '#E59934',
  terracotta: '#BC4E26',
  'terracotta-400': '#D9653B',
  sand: '#F5F1EB',
  'sand-50': '#FAF7F2',
  'sand-100': '#F1ECE3',
  'sand-200': '#EFEAE1',
  'sand-300': '#E6DFD3',
  'sand-400': '#D6CCBC',
  white: '#FFFFFF',
  cloud: '#F1F5F9',
  'text-muted': '#5A6874',
  'text-muted-dark': '#94A3B8',
  income: { light: '#18744C', dark: '#80ED99' },
  expense: { light: '#AD4621', dark: '#EA8461' },
} as const;

/** Sequência de cores de gráficos no tema claro (doc 13 §2.4), sempre com legenda textual. */
export const chartSequence = [
  color.midnight,
  color.teal,
  color['teal-300'],
  color.sun,
  color.terracotta,
  color['sand-400'],
] as const;

/** Sequência de cores de gráficos no tema escuro (doc 13 §2.4). */
export const chartSequenceDark = [
  color['teal-300'],
  color['teal-400'],
  color.ice,
  color.sun,
  color['terracotta-400'],
  color['text-muted-dark'],
] as const;

/** Raios em px (doc 13 §4 e §6). */
export const radius = { sm: 8, md: 12, lg: 16, xl: 18 } as const;

export const font = {
  display: 'Plus Jakarta Sans',
  ui: 'Inter',
  kids: 'Nunito',
  fallback: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/** Escala tipográfica em px (doc 13 §3). */
export const fontSize = { xs: 12, sm: 14, md: 16, lg: 20, xl: 24, '2xl': 32, '3xl': 40 } as const;

export const lineHeight = { body: 1.5, heading: 1.2 } as const;
