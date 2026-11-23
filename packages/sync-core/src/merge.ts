import { compareHlc } from './hlc.js';

/** Valores que atravessam o protocolo de sync: o que o JSON representa. */
export type FieldValue =
  string | number | boolean | null | readonly FieldValue[] | { readonly [key: string]: FieldValue };

export type Fields = Readonly<Record<string, FieldValue>>;
/** HLC da última escrita de cada campo. */
export type FieldClocks = Readonly<Record<string, string>>;

/** Estado de um registro numa réplica (dispositivo ou servidor) para o merge por campo. */
export interface ReplicaRecord {
  readonly fields: Fields;
  readonly clocks: FieldClocks;
}

export interface MergeResult {
  readonly record: ReplicaRecord;
  /** Campos cujo valor ou HLC mudou: vazio quando a entrada não trouxe nada novo. */
  readonly changed: readonly string[];
}

/** Desempate determinístico para o caso (teórico) de dois valores com o mesmo HLC. */
const valueKey = (value: FieldValue | undefined): string => JSON.stringify(value ?? null);

function incomingWins(
  localClock: string | undefined,
  localValue: FieldValue | undefined,
  incomingClock: string,
  incomingValue: FieldValue,
): boolean {
  if (localClock === undefined) {
    return true;
  }
  const order = compareHlc(incomingClock, localClock);
  return order > 0 || (order === 0 && valueKey(incomingValue) > valueKey(localValue));
}

/**
 * Merge por campo (doc 07 §4): para cada campo vence o maior HLC. Comutativo, associativo e
 * idempotente, então réplicas que recebem as mesmas mudanças em qualquer ordem convergem.
 * Exclusão é um campo como outro (`deletedAt`, tombstone): edição antiga não ressuscita o registro.
 */
export function mergeRecord(
  local: ReplicaRecord | undefined,
  incoming: ReplicaRecord,
): MergeResult {
  const fields: Record<string, FieldValue> = { ...local?.fields };
  const clocks: Record<string, string> = { ...local?.clocks };
  const changed: string[] = [];
  for (const [name, clock] of Object.entries(incoming.clocks)) {
    const value = incoming.fields[name] ?? null;
    if (incomingWins(clocks[name], fields[name], clock, value)) {
      if (clocks[name] !== clock || valueKey(fields[name]) !== valueKey(value)) {
        changed.push(name);
      }
      fields[name] = value;
      clocks[name] = clock;
    }
  }
  return { record: { fields, clocks }, changed };
}
