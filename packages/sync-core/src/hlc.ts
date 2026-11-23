/**
 * Relógio lógico híbrido (HLC, doc 07 §4, RNF-SYN-03). Ordena mudanças entre dispositivos mesmo
 * com relógios de parede diferentes: parede em ms + contador + nó. Serializado em largura fixa,
 * a comparação de texto é a ordem do HLC e o nó desempata, então nunca há dois HLC iguais vindos
 * de dispositivos diferentes.
 */
export interface Hlc {
  /** Milissegundos desde a época (relógio de parede do dispositivo). */
  readonly wall: number;
  /** Desempate dentro do mesmo milissegundo. */
  readonly counter: number;
  /** Identificador do dispositivo: 16 dígitos hexadecimais minúsculos. */
  readonly node: string;
}

export class InvalidHlcError extends Error {
  override readonly name = 'InvalidHlcError';
}

export class ClockDriftError extends Error {
  override readonly name = 'ClockDriftError';
}

const WALL_DIGITS = 15;
const COUNTER_DIGITS = 6;
const MAX_COUNTER = 999_999;
const MAX_WALL = 999_999_999_999_999;
const NODE = /^[0-9a-f]{16}$/;
const SERIALIZED = /^(\d{15})-(\d{6})-([0-9a-f]{16})$/;

/** Diferença máxima aceita entre um HLC recebido e o relógio local (evita "vencer sempre"). */
export const MAX_DRIFT_MS = 5 * 60 * 1000;

function assertNode(node: string): void {
  if (!NODE.test(node)) {
    throw new InvalidHlcError(`Nó do HLC precisa ter 16 dígitos hexadecimais; recebido "${node}".`);
  }
}

function assertWall(wall: number): void {
  if (!Number.isSafeInteger(wall) || wall < 0 || wall > MAX_WALL) {
    throw new InvalidHlcError(`Relógio de parede inválido: ${wall}.`);
  }
}

export function formatHlc({ wall, counter, node }: Hlc): string {
  assertWall(wall);
  if (!Number.isSafeInteger(counter) || counter < 0 || counter > MAX_COUNTER) {
    throw new InvalidHlcError(`Contador do HLC fora da faixa: ${counter}.`);
  }
  assertNode(node);
  return `${String(wall).padStart(WALL_DIGITS, '0')}-${String(counter).padStart(COUNTER_DIGITS, '0')}-${node}`;
}

export function parseHlc(value: string): Hlc {
  const match = SERIALIZED.exec(value);
  if (!match) {
    throw new InvalidHlcError(`HLC mal formado: "${value}".`);
  }
  const [, wall = '', counter = '', node = ''] = match;
  return { wall: Number(wall), counter: Number(counter), node };
}

/** Ordem total dos HLC serializados. */
export function compareHlc(a: string, b: string): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Próximo HLC para um evento local. */
export function tickHlc(last: Hlc, wallNow: number): Hlc {
  assertWall(wallNow);
  return wallNow > last.wall
    ? { wall: wallNow, counter: 0, node: last.node }
    : { wall: last.wall, counter: last.counter + 1, node: last.node };
}

/** Avança o relógio local depois de ver um HLC remoto; recusa relógio remoto adiantado demais. */
export function receiveHlc(last: Hlc, remote: Hlc, wallNow: number): Hlc {
  assertWall(wallNow);
  if (remote.wall > wallNow + MAX_DRIFT_MS) {
    throw new ClockDriftError(
      `HLC remoto ${remote.wall - wallNow} ms à frente do relógio local (máximo ${MAX_DRIFT_MS} ms).`,
    );
  }
  const wall = Math.max(last.wall, remote.wall, wallNow);
  const counter =
    wall === last.wall && wall === remote.wall
      ? Math.max(last.counter, remote.counter) + 1
      : wall === last.wall
        ? last.counter + 1
        : wall === remote.wall
          ? remote.counter + 1
          : 0;
  return { wall, counter, node: last.node };
}

/**
 * Relógio de um dispositivo. Guarda o último HLC emitido ou visto; o app persiste `last` para não
 * voltar no tempo depois de reiniciar.
 */
export class HlcClock {
  private state: Hlc;

  constructor(
    node: string,
    private readonly wallClock: () => number,
    last?: string,
  ) {
    assertNode(node);
    this.state = last === undefined ? { wall: 0, counter: 0, node } : { ...parseHlc(last), node };
  }

  /** HLC para uma mudança feita neste dispositivo. */
  next(): string {
    this.state = tickHlc(this.state, this.wallClock());
    return formatHlc(this.state);
  }

  /** Registra um HLC recebido de outro dispositivo. */
  observe(remote: string): void {
    this.state = receiveHlc(this.state, parseHlc(remote), this.wallClock());
  }

  get last(): string {
    return formatHlc(this.state);
  }
}
