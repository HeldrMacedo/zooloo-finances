import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MASKED, maskEmail, maskIp, maskText, redact, REDACTED } from './mask.js';

describe('maskEmail (doc 10 §2, C2)', () => {
  it('mantém a 1ª letra e o domínio', () => {
    expect(maskEmail('helder@dominio.com')).toBe('h***@dominio.com');
    expect(maskEmail('a@b.io')).toBe('a***@b.io');
  });

  it('valor que não é e-mail vira MASKED', () => {
    expect(maskEmail('sem-arroba')).toBe(MASKED);
  });
});

describe('maskIp', () => {
  it('IPv4 mantém os dois primeiros octetos', () => {
    expect(maskIp('203.0.113.42')).toBe('203.0.*.*');
  });

  it('IPv6 mantém os três primeiros grupos', () => {
    expect(maskIp('2001:db8:85a3:0:0:8a2e:370:7334')).toBe('2001:db8:85a3:*');
  });

  it('valor que não é IP vira MASKED', () => {
    expect(maskIp('localhost')).toBe(MASKED);
  });
});

describe('maskText', () => {
  it('mascara e-mails, JWTs e Bearer dentro de texto livre', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJh';
    expect(maskText(`falha para joao@x.com com token ${jwt}`)).toBe(
      `falha para j***@x.com com token ${REDACTED}`,
    );
    expect(maskText('Authorization: Bearer abc.def-123')).toBe(`Authorization: Bearer ${REDACTED}`);
  });
});

describe('redact (SEC-LOG-01)', () => {
  it('remove segredos (C4)', () => {
    expect(
      redact({
        password: 'hunter2',
        senha: 'x',
        pin: '1234',
        accessToken: 'a',
        refresh_token: 'r',
        authorization: 'Bearer t',
        cookie: 'sid=1',
        apiKey: 'k',
        itemId: 'pluggy-1',
        totpCode: '123456',
      }),
    ).toEqual({
      password: REDACTED,
      senha: REDACTED,
      pin: REDACTED,
      accessToken: REDACTED,
      refresh_token: REDACTED,
      authorization: REDACTED,
      cookie: REDACTED,
      apiKey: REDACTED,
      itemId: REDACTED,
      totpCode: REDACTED,
    });
  });

  it('mascara dados financeiros (C3) e pessoais (C2)', () => {
    expect(
      redact({
        amount: 10_000,
        balance: { cents: 5, currency: 'BRL' },
        description: 'Farmácia',
        notes: 'remédio',
        name: 'Helder',
        email: 'helder@dominio.com',
        ip: '203.0.113.42',
        transactionId: 'tx-1',
        count: 3,
      }),
    ).toEqual({
      amount: MASKED,
      balance: MASKED,
      description: MASKED,
      notes: MASKED,
      name: MASKED,
      email: 'h***@dominio.com',
      ip: '203.0.*.*',
      transactionId: 'tx-1',
      count: 3,
    });
  });

  it('mascara objeto com formato de Money em qualquer chave', () => {
    expect(redact({ x: { cents: 100, currency: 'BRL' } })).toEqual({ x: MASKED });
  });

  it('percorre listas e objetos aninhados', () => {
    expect(redact({ items: [{ valor: 1, id: 'a' }], ctx: { deep: { senha: 's' } } })).toEqual({
      items: [{ valor: MASKED, id: 'a' }],
      ctx: { deep: { senha: REDACTED } },
    });
  });

  it('mascara e-mail em texto de campos comuns', () => {
    expect(redact({ reason: 'convite para ana@x.com' })).toEqual({
      reason: 'convite para a***@x.com',
    });
  });

  it('serializa Error sem perder o tipo e mascarando a mensagem', () => {
    const error = new TypeError('falhou para ana@x.com');
    const result = redact({ err: error }) as { err: Record<string, unknown> };
    expect(result.err['name']).toBe('TypeError');
    expect(result.err['message']).toBe('falhou para a***@x.com');
    expect(typeof result.err['stack']).toBe('string');
  });

  it('aceita Error sem stack', () => {
    const error = new Error('x');
    delete error.stack;
    expect(redact(error)).toEqual({ name: 'Error', message: 'x', stack: undefined });
  });

  it('corta ciclos e profundidade excessiva', () => {
    const cyclic: Record<string, unknown> = { id: 1 };
    cyclic['self'] = cyclic;
    expect(redact(cyclic)).toEqual({ id: 1, self: '[Circular]' });

    let deep: Record<string, unknown> = { leaf: true };
    for (let level = 0; level < 20; level += 1) {
      deep = { next: deep };
    }
    expect(JSON.stringify(redact(deep))).toContain('[Depth]');
  });

  it('mantém primitivos inofensivos', () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(true)).toBe(true);
    expect(redact(42)).toBe(42);
    expect(redact(10n)).toBe('10');
    expect(redact(Symbol('s'))).toBe('[Unsupported]');
    expect(redact(() => 1)).toBe('[Unsupported]');
  });

  it('propriedade: segredo e valor financeiro nunca aparecem na saída serializada', () => {
    const secretKey = fc.constantFrom('password', 'token', 'pin', 'refreshToken', 'secret');
    const financialKey = fc.constantFrom('amount', 'description', 'notes', 'saldo', 'valor');
    const marker = fc.string({ minLength: 8 }).map((value) => `ZL${value}ZL`);
    fc.assert(
      fc.property(secretKey, financialKey, marker, marker, (sk, fk, secret, finance) => {
        const output = JSON.stringify(
          redact({ ctx: { [sk]: secret, nested: [{ [fk]: finance }] } }),
        );
        expect(output).not.toContain(JSON.stringify(secret).slice(1, -1));
        expect(output).not.toContain(JSON.stringify(finance).slice(1, -1));
      }),
    );
  });
});
