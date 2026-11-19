import { color, parseHexColor } from '@zooloo/ui-tokens';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodePng } from './png.ts';
import { markSvg, rasterizeMark } from './provisional-mark.ts';

const colors = { circle: color.teal, glyph: color.white };

function pixel(rgba: Uint8Array, size: number, x: number, y: number): number[] {
  const offset = (y * size + x) * 4;
  return Array.from(rgba.slice(offset, offset + 4));
}

const rgb = (hex: string) => {
  const { r, g, b } = parseHexColor(hex);
  return [r, g, b, 255];
};

describe('rasterizeMark', () => {
  const size = 100;
  const transparent = rasterizeMark({ ...colors, size, scale: 1, background: null });

  it('canto transparente, círculo Teal e "Z" branco', () => {
    expect(pixel(transparent, size, 0, 0)).toEqual([0, 0, 0, 0]);
    expect(pixel(transparent, size, 50, 15)).toEqual(rgb(color.teal));
    // Centro da diagonal do Z e meio da barra de cima.
    expect(pixel(transparent, size, 50, 50)).toEqual(rgb(color.white));
    expect(pixel(transparent, size, 50, 34)).toEqual(rgb(color.white));
  });

  it('maskable: fundo opaco nos cantos e símbolo dentro da área segura', () => {
    const maskable = rasterizeMark({ ...colors, size, scale: 0.8, background: color.midnight });
    expect(pixel(maskable, size, 0, 0)).toEqual(rgb(color.midnight));
    // Símbolo ocupa 80%: de 10 a 90 px. Acima disso é fundo; logo abaixo da borda, círculo Teal.
    expect(pixel(maskable, size, 50, 8)).toEqual(rgb(color.midnight));
    expect(pixel(maskable, size, 50, 22)).toEqual(rgb(color.teal));
  });

  it('borda do círculo tem alfa intermediário (antisserrilhado)', () => {
    const alphas = Array.from({ length: size }, (_, x) => pixel(transparent, size, x, 20)[3]);
    expect(alphas.some((alpha) => alpha !== undefined && alpha > 0 && alpha < 255)).toBe(true);
  });
});

describe('encodePng', () => {
  it('gera PNG válido com cabeçalho e pixels íntegros', () => {
    const rgba = new Uint8Array([255, 0, 0, 255, 0, 0, 255, 128]);
    const file = encodePng(2, 1, rgba);
    expect(file.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(file.readUInt32BE(16)).toBe(2);
    expect(file.readUInt32BE(20)).toBe(1);
    const idatLength = file.readUInt32BE(33);
    expect(file.subarray(37, 41).toString('ascii')).toBe('IDAT');
    const raw = inflateSync(file.subarray(41, 41 + idatLength));
    expect(Array.from(raw)).toEqual([0, ...rgba]);
    expect(file.subarray(-8, -4).toString('ascii')).toBe('IEND');
    // CRC do IEND é fixo pela especificação do PNG.
    expect(file.readUInt32BE(file.length - 4)).toBe(0xae426082);
  });
});

describe('markSvg', () => {
  it('SVG com as cores dos tokens', () => {
    const svg = markSvg(colors);
    expect(svg).toContain(`fill="${color.teal}"`);
    expect(svg).toContain(`fill="${color.white}"`);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  });
});
