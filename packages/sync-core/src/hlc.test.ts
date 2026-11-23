import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ClockDriftError,
  compareHlc,
  formatHlc,
  HlcClock,
  InvalidHlcError,
  MAX_DRIFT_MS,
  parseHlc,
  receiveHlc,
  tickHlc,
} from './hlc.js';

const NODE_A = '00000000000000aa';
const NODE_B = '00000000000000bb';

const hlcArb = fc.record({
  wall: fc.integer({ min: 0, max: 999_999_999_999_999 }),
  counter: fc.integer({ min: 0, max: 999_999 }),
  node: fc.stringMatching(/^[0-9a-f]{16}$/),
});

describe('formatHlc / parseHlc', () => {
  it('largura fixa: parede 15, contador 6, nó 16', () => {
    expect(formatHlc({ wall: 1_763_556_400_000, counter: 7, node: NODE_A })).toBe(
      '001763556400000-000007-00000000000000aa',
    );
  });

  it('ida e volta preserva o valor', () => {
    fc.assert(
      fc.property(hlcArb, (hlc) => {
        expect(parseHlc(formatHlc(hlc))).toEqual(hlc);
      }),
    );
  });

  it('ordem do texto é a ordem do HLC (parede, contador, nó)', () => {
    fc.assert(
      fc.property(hlcArb, hlcArb, (a, b) => {
        const expected =
          a.wall !== b.wall
            ? Math.sign(a.wall - b.wall)
            : a.counter !== b.counter
              ? Math.sign(a.counter - b.counter)
              : a.node < b.node
                ? -1
                : a.node > b.node
                  ? 1
                  : 0;
        expect(compareHlc(formatHlc(a), formatHlc(b))).toBe(expected);
      }),
    );
  });

  it.each([
    [{ wall: -1, counter: 0, node: NODE_A }, /parede/],
    [{ wall: 1.5, counter: 0, node: NODE_A }, /parede/],
    [{ wall: 1_000_000_000_000_000, counter: 0, node: NODE_A }, /parede/],
    [{ wall: 0, counter: -1, node: NODE_A }, /Contador/],
    [{ wall: 0, counter: 1_000_000, node: NODE_A }, /Contador/],
    [{ wall: 0, counter: 0.5, node: NODE_A }, /Contador/],
    [{ wall: 0, counter: 0, node: 'XYZ' }, /16 dígitos/],
    [{ wall: 0, counter: 0, node: '00000000000000AA' }, /16 dígitos/],
  ])('recusa %o', (hlc, message) => {
    expect(() => formatHlc(hlc)).toThrow(InvalidHlcError);
    expect(() => formatHlc(hlc)).toThrow(message);
  });

  it.each([
    '',
    '1763556400000-000007-00000000000000aa',
    '001763556400000-7-00000000000000aa',
    '001763556400000-000007-00000000000000a',
    'x001763556400000-000007-00000000000000aa',
    '001763556400000-000007-00000000000000aax',
  ])('parse recusa "%s"', (value) => {
    expect(() => parseHlc(value)).toThrow(InvalidHlcError);
  });
});

describe('tickHlc', () => {
  const last = { wall: 1000, counter: 4, node: NODE_A };

  it('relógio andou: usa a parede e zera o contador', () => {
    expect(tickHlc(last, 2000)).toEqual({ wall: 2000, counter: 0, node: NODE_A });
  });

  it('relógio parado ou atrasado: mantém a parede e incrementa o contador', () => {
    expect(tickHlc(last, 1000)).toEqual({ wall: 1000, counter: 5, node: NODE_A });
    expect(tickHlc(last, 10)).toEqual({ wall: 1000, counter: 5, node: NODE_A });
  });

  it('é sempre estritamente crescente', () => {
    fc.assert(
      fc.property(hlcArb, fc.integer({ min: 0, max: 999_999_999_999_999 }), (hlc, now) => {
        fc.pre(hlc.counter < 999_999);
        expect(compareHlc(formatHlc(tickHlc(hlc, now)), formatHlc(hlc))).toBe(1);
      }),
    );
  });

  it('recusa parede inválida', () => {
    expect(() => tickHlc(last, Number.NaN)).toThrow(InvalidHlcError);
  });
});

describe('receiveHlc', () => {
  const last = { wall: 1000, counter: 4, node: NODE_A };

  it('parede local maior que tudo: zera o contador', () => {
    expect(receiveHlc(last, { wall: 1500, counter: 9, node: NODE_B }, 2000)).toEqual({
      wall: 2000,
      counter: 0,
      node: NODE_A,
    });
  });

  it('remoto à frente (dentro do limite): adota a parede remota', () => {
    expect(receiveHlc(last, { wall: 3000, counter: 9, node: NODE_B }, 2000)).toEqual({
      wall: 3000,
      counter: 10,
      node: NODE_A,
    });
  });

  it('último local à frente: incrementa o contador local', () => {
    expect(receiveHlc(last, { wall: 500, counter: 9, node: NODE_B }, 900)).toEqual({
      wall: 1000,
      counter: 5,
      node: NODE_A,
    });
  });

  it('mesma parede nos três: maior contador + 1', () => {
    expect(receiveHlc(last, { wall: 1000, counter: 9, node: NODE_B }, 1000)).toEqual({
      wall: 1000,
      counter: 10,
      node: NODE_A,
    });
    expect(receiveHlc(last, { wall: 1000, counter: 1, node: NODE_B }, 1000)).toEqual({
      wall: 1000,
      counter: 5,
      node: NODE_A,
    });
  });

  it('resultado é maior que o último local e que o remoto', () => {
    fc.assert(
      fc.property(hlcArb, hlcArb, fc.integer({ min: 0, max: 999_999_999_999 }), (a, b, now) => {
        fc.pre(a.counter < 999_998 && b.counter < 999_998 && b.wall <= now + MAX_DRIFT_MS);
        const next = formatHlc(receiveHlc(a, b, now));
        expect(compareHlc(next, formatHlc(a))).toBe(1);
        expect(next.slice(0, 22) > formatHlc(b).slice(0, 22)).toBe(true);
      }),
    );
  });

  it('recusa relógio remoto adiantado além do limite', () => {
    const remote = { wall: 2000 + MAX_DRIFT_MS + 1, counter: 0, node: NODE_B };
    expect(() => receiveHlc(last, remote, 2000)).toThrow(ClockDriftError);
    expect(() => receiveHlc(last, remote, 2000)).toThrow(/à frente/);
    expect(receiveHlc(last, { ...remote, wall: 2000 + MAX_DRIFT_MS }, 2000).wall).toBe(
      2000 + MAX_DRIFT_MS,
    );
  });

  it('recusa parede local inválida', () => {
    expect(() => receiveHlc(last, last, -5)).toThrow(InvalidHlcError);
  });
});

describe('HlcClock', () => {
  it('emite HLC crescentes mesmo com o relógio parado', () => {
    const clock = new HlcClock(NODE_A, () => 1000);
    const first = clock.next();
    const second = clock.next();
    expect(first).toBe('000000000001000-000000-00000000000000aa');
    expect(second).toBe('000000000001000-000001-00000000000000aa');
    expect(clock.last).toBe(second);
  });

  it('retoma do último HLC salvo, mantendo o próprio nó', () => {
    const clock = new HlcClock(NODE_A, () => 10, '000000000001000-000003-00000000000000bb');
    expect(clock.next()).toBe('000000000001000-000004-00000000000000aa');
  });

  it('observar um HLC remoto faz o próximo ser maior que ele', () => {
    const clock = new HlcClock(NODE_A, () => 1000);
    const remote = '000000000002000-000005-00000000000000bb';
    clock.observe(remote);
    expect(compareHlc(clock.next(), remote)).toBe(1);
  });

  it('recusa nó inválido', () => {
    expect(() => new HlcClock('abc', () => 0)).toThrow(InvalidHlcError);
  });
});
