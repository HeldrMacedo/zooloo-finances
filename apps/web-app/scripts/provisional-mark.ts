import { parseHexColor } from '@zooloo/ui-tokens';

/**
 * Símbolo PROVISÓRIO (doc 13 §7.1): círculo Teal com "Z" branco. Sai quando chegarem os
 * vetores da coruja; até lá todo ícone vem daqui e de `src/ui/brand/ZoolooLogo.tsx`.
 * Geometria em unidades de 0 a 1, compartilhada entre o SVG e o rasterizador dos PNGs.
 */
type Point = readonly [number, number];

/** "Z" como um polígono: barra de cima, diagonal e barra de baixo. */
export const Z_POLYGON: readonly Point[] = [
  [0.3, 0.3],
  [0.7, 0.3],
  [0.7, 0.39],
  [0.44, 0.61],
  [0.7, 0.61],
  [0.7, 0.7],
  [0.3, 0.7],
  [0.3, 0.61],
  [0.56, 0.39],
  [0.3, 0.39],
];

export interface MarkColors {
  readonly circle: string;
  readonly glyph: string;
}

export function markSvg({ circle, glyph }: MarkColors): string {
  const points = Z_POLYGON.map(([x, y]) => `${x * 100},${y * 100}`).join(' ');
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    `<circle cx="50" cy="50" r="50" fill="${circle}"/>`,
    `<polygon points="${points}" fill="${glyph}"/>`,
    '</svg>',
  ].join('');
}

function insidePolygon(x: number, y: number, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i] ?? [0, 0];
    const [xj, yj] = polygon[j] ?? [0, 0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export interface RasterOptions extends MarkColors {
  readonly size: number;
  /** Fração do lado ocupada pelo símbolo (0,8 no ícone maskable, área segura do doc 13 §5.1). */
  readonly scale: number;
  /** Cor de fundo do quadrado inteiro; `null` deixa transparente. */
  readonly background: string | null;
}

const SAMPLES = 4;

/** Rasteriza o símbolo em RGBA com antisserrilhado por supersampling 4×4. */
export function rasterizeMark(options: RasterOptions): Uint8Array {
  const { size, scale } = options;
  const circle = parseHexColor(options.circle);
  const glyph = parseHexColor(options.glyph);
  const background = options.background === null ? null : parseHexColor(options.background);
  const pixels = new Uint8Array(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          // Coordenada no espaço do símbolo (0..1), centralizado e reduzido por `scale`.
          const x = ((px + (sx + 0.5) / SAMPLES) / size - 0.5) / scale + 0.5;
          const y = ((py + (sy + 0.5) / SAMPLES) / size - 0.5) / scale + 0.5;
          const inCircle = (x - 0.5) ** 2 + (y - 0.5) ** 2 <= 0.25;
          const color = inCircle ? (insidePolygon(x, y, Z_POLYGON) ? glyph : circle) : background;
          if (color) {
            r += color.r;
            g += color.g;
            b += color.b;
            a += 255;
          }
        }
      }
      const total = SAMPLES * SAMPLES;
      const offset = (py * size + px) * 4;
      // Cor média só das amostras opacas; a cobertura vira o alfa.
      const opaque = a / 255;
      pixels[offset] = opaque ? Math.round(r / opaque) : 0;
      pixels[offset + 1] = opaque ? Math.round(g / opaque) : 0;
      pixels[offset + 2] = opaque ? Math.round(b / opaque) : 0;
      pixels[offset + 3] = Math.round(a / total);
    }
  }
  return pixels;
}
