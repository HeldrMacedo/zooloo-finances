import { describe, expect, it } from 'vitest';
import { MASKED, maskIp, maskText, redact, REDACTED } from './mask.js';

// Lista normativa das chaves sensíveis (doc 10 §2 e SEC-LOG-01). Remover uma chave de mask.ts
// precisa quebrar este teste.
const SECRET_KEYS = [
  'password',
  'newPassword',
  'senha',
  'passphrase',
  'clientSecret',
  'token',
  'refresh_token',
  'Authorization',
  'set-cookie',
  'api-key',
  'api_key',
  'privateKey',
  'otp',
  'totp',
  'recoveryCode',
  'item_id',
  'dekWrapped',
  'pin',
  'code',
  'key',
  'jwt',
];

const MASKED_KEYS = [
  'amount',
  'value',
  'valor',
  'cents',
  'balance',
  'saldo',
  'total',
  'limit',
  'limite',
  'goal',
  'meta',
  'description',
  'descricao',
  'notes',
  'note',
  'observacoes',
  'observacao',
  'memo',
  'location',
  'local',
  'content',
  'attachment',
  'name',
  'nome',
  'full_name',
  'phone',
  'telefone',
  'cpf',
  'birthDate',
];

describe('chaves sensíveis', () => {
  it('constantes de substituição são estáveis', () => {
    expect(REDACTED).toBe('[REDACTED]');
    expect(MASKED).toBe('[MASKED]');
  });

  it.each(SECRET_KEYS)('remove segredo em "%s"', (key) => {
    expect(redact({ [key]: 'v' })).toEqual({ [key]: REDACTED });
  });

  it.each(MASKED_KEYS)('mascara "%s"', (key) => {
    expect(redact({ [key]: 'v' })).toEqual({ [key]: MASKED });
  });

  it.each(['email', 'mail', 'to', 'from'])('mascara e-mail em "%s"', (key) => {
    expect(redact({ [key]: 'ana@x.com' })).toEqual({ [key]: 'a***@x.com' });
  });

  it.each(['ip', 'ip_address', 'remoteAddress', 'clientIp'])('mascara IP em "%s"', (key) => {
    expect(redact({ [key]: '10.1.2.3' })).toEqual({ [key]: '10.1.*.*' });
  });

  it('chave de e-mail ou IP com valor não textual segue a regra geral', () => {
    expect(redact({ email: 5, ip: null })).toEqual({ email: 5, ip: null });
  });

  it('chave comum com texto só passa por maskText', () => {
    expect(redact({ status: 'ok' })).toEqual({ status: 'ok' });
  });
});

describe('bordas de formato', () => {
  it('objeto com só uma das chaves de Money não é tratado como Money', () => {
    expect(redact({ x: { currency: 'BRL' } })).toEqual({ x: { currency: 'BRL' } });
  });

  it('IPv4 exige o endereço inteiro', () => {
    expect(maskIp('x10.1.2.3')).toBe(MASKED);
    expect(maskIp('10.1.2.3x')).toBe(MASKED);
    expect(maskIp('10.123.2.3')).toBe('10.123.*.*');
  });

  it('IPv6 comprimido nunca mantém o grupo do host', () => {
    expect(maskIp('fe80::1')).toBe('fe80:*');
    expect(maskIp('2001:db8::8a2e:370:7334')).toBe('2001:db8::*');
    expect(maskIp('a:b')).toBe(MASKED);
    expect(maskIp('g:h:i')).toBe(MASKED);
  });

  it('e-mail com espaços ou dois arrobas não é aceito como e-mail', () => {
    expect(redact({ email: 'a@b@c' })).toEqual({ email: MASKED });
    expect(redact({ email: 'x a@b.com' })).toEqual({ email: MASKED });
    expect(redact({ email: 'a@b.com x' })).toEqual({ email: MASKED });
  });

  it('maskText mascara e-mail inteiro, inclusive com ponto e sinal', () => {
    expect(maskText('de ana.maria+fin@sub.x.com.br.')).toBe('de a***@sub.x.com.br.');
    expect(maskText('Bearer   tok')).toBe(`Bearer ${REDACTED}`);
  });

  it('profundidade 8 ainda é percorrida; a 9ª vira [Depth]', () => {
    let value: unknown = 'folha';
    for (let level = 0; level < 8; level += 1) {
      value = [value];
    }
    expect(JSON.stringify(redact(value))).toContain('folha');
    expect(JSON.stringify(redact([value]))).toContain('[Depth]');
  });
});
