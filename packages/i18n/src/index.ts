import { ptBR } from './messages/pt-BR.js';
import { createTranslator } from './translate.js';

export * from './date-format.js';
export * from './messages/pt-BR.js';
export * from './money-format.js';
export * from './translate.js';

/** Tradutor padrão do produto (pt-BR). */
export const t = createTranslator(ptBR);
