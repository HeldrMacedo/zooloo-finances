import { color } from '@zooloo/ui-tokens';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png.ts';
import { markSvg, rasterizeMark } from './provisional-mark.ts';

/**
 * Gera os ícones PROVISÓRIOS em `public/icons/` (doc 13 §7.1). Único diretório de ícones: quando os
 * vetores definitivos chegarem, só este script e `ZoolooLogo` mudam. Rode `pnpm icons`.
 */
const out = fileURLToPath(new URL('../public/icons/', import.meta.url));
const colors = { circle: color.teal, glyph: color.white };

const png = (size: number, scale: number, background: string | null) =>
  encodePng(size, size, rasterizeMark({ ...colors, size, scale, background }));

mkdirSync(out, { recursive: true });
writeFileSync(`${out}zooloo-192.png`, png(192, 1, null));
writeFileSync(`${out}zooloo-512.png`, png(512, 1, null));
// Maskable: o sistema recorta em círculo/squircle; símbolo em 80% sobre fundo Midnight.
writeFileSync(`${out}zooloo-maskable-512.png`, png(512, 0.8, color.midnight));
writeFileSync(`${out}apple-touch-icon.png`, png(180, 0.8, color.midnight));
writeFileSync(`${out}favicon.svg`, `${markSvg(colors)}\n`);
