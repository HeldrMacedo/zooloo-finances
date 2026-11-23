import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createFieldCipher } from './field-cipher.js';

const KEY = new Uint8Array(32).fill(7);

describe('createFieldCipher (estratégia 2, só comparação)', () => {
  it('propriedade: decifra o que cifrou, no mesmo contexto', async () => {
    const cipher = await createFieldCipher(KEY);
    await fc.assert(
      fc.asyncProperty(fc.string(), fc.string({ minLength: 1 }), async (plain, context) => {
        const sealed = await cipher.encrypt(plain, context);
        expect(sealed).toMatch(/^v1\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/);
        expect(await cipher.decrypt(sealed, context)).toBe(plain);
      }),
      { numRuns: 50 },
    );
  });

  it('IV aleatório: o mesmo texto cifra diferente e não aparece em claro', async () => {
    const cipher = await createFieldCipher(KEY);
    const first = await cipher.encrypt('Mercado do bairro', 'categories.name.1');
    const second = await cipher.encrypt('Mercado do bairro', 'categories.name.1');
    expect(first).not.toBe(second);
    expect(first).not.toContain('Mercado');
  });

  it('valor movido para outro contexto, adulterado ou fora do formato é recusado', async () => {
    const cipher = await createFieldCipher(KEY);
    const sealed = await cipher.encrypt('Aluguel', 'categories.name.1');
    await expect(cipher.decrypt(sealed, 'categories.name.2')).rejects.toThrow();
    const [prefix, iv, data] = sealed.split('.');
    const flipped = `${data?.startsWith('A') ? 'B' : 'A'}${data?.slice(1) ?? ''}`;
    await expect(
      cipher.decrypt(`${prefix}.${iv}.${flipped}`, 'categories.name.1'),
    ).rejects.toThrow();
    for (const bad of ['v2.a.b', 'v1.a', 'v1..b', 'v1.a.b.c']) {
      await expect(cipher.decrypt(bad, 'x')).rejects.toThrow(/formato desconhecido/);
    }
  });

  it('outra chave não decifra', async () => {
    const sealed = await (await createFieldCipher(KEY)).encrypt('Salário', 'ctx');
    const other = await createFieldCipher(new Uint8Array(32).fill(8));
    await expect(other.decrypt(sealed, 'ctx')).rejects.toThrow();
  });
});
