import { LOCALE } from './money-format.js';

export class MissingParamError extends Error {
  override readonly name = 'MissingParamError';
}

export interface PluralMessage {
  readonly zero?: string;
  readonly one: string;
  readonly other: string;
}

type Leaf = string | PluralMessage;

/** Chaves em notação de ponto até um texto ou uma mensagem com plural. */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends Leaf ? K : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

export type Params = Readonly<Record<string, string | number>>;

const PLACEHOLDER = /\{(\w+)\}/g;

function isPlural(node: unknown): node is PluralMessage {
  return typeof node === 'object' && node !== null && 'other' in node;
}

export function createTranslator<T extends object>(messages: T) {
  const numberFormat = new Intl.NumberFormat(LOCALE);
  const pluralRules = new Intl.PluralRules(LOCALE);

  const interpolate = (key: string, template: string, params: Params): string =>
    template.replace(PLACEHOLDER, (_, name: string) => {
      const value = params[name];
      if (value === undefined) {
        throw new MissingParamError(`Parâmetro "${name}" ausente em "${key}".`);
      }
      return typeof value === 'number' ? numberFormat.format(value) : value;
    });

  return function t(key: MessageKey<T>, params: Params = {}): string {
    const node = key
      .split('.')
      .reduce<unknown>((current, part) => (current as Record<string, unknown>)[part], messages);
    if (!isPlural(node)) {
      return interpolate(key, node as string, params);
    }
    const count = params['count'];
    if (typeof count !== 'number') {
      throw new MissingParamError(`Parâmetro "count" ausente em "${key}".`);
    }
    const form =
      count === 0 && node.zero !== undefined
        ? node.zero
        : pluralRules.select(count) === 'one'
          ? node.one
          : node.other;
    return interpolate(key, form, params);
  };
}
