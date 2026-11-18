import * as z from 'zod';
import { afterEach, describe, expect, it } from 'vitest';
import { useBrazilianPortugueseErrors } from './locale.js';

describe('useBrazilianPortugueseErrors', () => {
  afterEach(() => {
    z.config(z.locales.en());
  });

  it('troca as mensagens padrão do Zod para pt-BR', () => {
    useBrazilianPortugueseErrors();
    const message = z.string().min(2).safeParse('a').error?.issues[0]?.message;
    expect(message).toMatch(/pequeno/i);
  });
});
