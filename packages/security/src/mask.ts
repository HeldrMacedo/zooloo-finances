/**
 * Mascaramento de logs (SEC-LOG-01, RNF-OBS-01) pela classificação do doc 10 §2:
 * C4 (segredo) é removido, C3 (financeiro) e C2 (pessoal) são mascarados.
 */
export const REDACTED = '[REDACTED]';
export const MASKED = '[MASKED]';

const MAX_DEPTH = 8;

const normalize = (key: string): string => key.toLowerCase().replace(/[_-]/g, '');

const SECRET_KEY_PARTS = [
  'password',
  'senha',
  'passphrase',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'privatekey',
  'otp',
  'totp',
  'recoverycode',
  'itemid',
  'dek',
];
const SECRET_KEYS = new Set(['pin', 'code', 'key', 'jwt']);

const FINANCIAL_KEYS = new Set(
  [
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
    'fullname',
    'phone',
    'telefone',
    'cpf',
    'birthdate',
  ].map(normalize),
);

const EMAIL_KEYS = new Set(['email', 'mail', 'to', 'from']);
const IP_KEYS = new Set(['ip', 'ipaddress', 'remoteaddress', 'clientip']);

const EMAIL_IN_TEXT = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const JWT_IN_TEXT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_IN_TEXT = /\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi;
const EMAIL = /^([^@\s])[^@\s]*@([^@\s]+)$/;
const IPV4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/;
const IPV6 = /^[0-9A-Fa-f:]+$/;

export function maskEmail(value: string): string {
  const match = EMAIL.exec(value);
  return match ? `${match[1]}***@${match[2]}` : MASKED;
}

export function maskIp(value: string): string {
  const v4 = IPV4.exec(value);
  if (v4) {
    return `${v4[1]}.${v4[2]}.*.*`;
  }
  const groups = value.split(':');
  if (!IPV6.test(value) || groups.length < 3) {
    return MASKED;
  }
  // Nunca mantém o último grupo: em endereço comprimido (fe80::1) ele identifica o host.
  return `${groups.slice(0, Math.min(3, groups.length - 2)).join(':')}:*`;
}

/** Mascara e-mails e remove JWTs e tokens Bearer dentro de texto livre. */
export function maskText(value: string): string {
  return value
    .replace(JWT_IN_TEXT, REDACTED)
    .replace(BEARER_IN_TEXT, `$1 ${REDACTED}`)
    .replace(EMAIL_IN_TEXT, '$1***@$2');
}

function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key) || SECRET_KEY_PARTS.some((part) => key.includes(part));
}

function isMoneyShape(value: object): boolean {
  return 'cents' in value && 'currency' in value;
}

function redactByKey(key: string, value: unknown, seen: WeakSet<object>, depth: number): unknown {
  const normalized = normalize(key);
  if (isSecretKey(normalized)) {
    return REDACTED;
  }
  if (FINANCIAL_KEYS.has(normalized)) {
    return MASKED;
  }
  if (typeof value === 'string' && EMAIL_KEYS.has(normalized)) {
    return maskEmail(value);
  }
  if (typeof value === 'string' && IP_KEYS.has(normalized)) {
    return maskIp(value);
  }
  return redactValue(value, seen, depth);
}

function redactValue(value: unknown, seen: WeakSet<object>, depth: number): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value === 'string') {
    return maskText(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value !== 'object') {
    return '[Unsupported]';
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  if (depth >= MAX_DEPTH) {
    return '[Depth]';
  }
  if (isMoneyShape(value)) {
    return MASKED;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, seen, depth + 1));
  }
  const fields = Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactByKey(key, item, seen, depth + 1)]),
  );
  if (value instanceof Error) {
    // name/message/stack não são enumeráveis; o nome da classe não é dado pessoal.
    return {
      name: value.name,
      message: maskText(value.message),
      stack: value.stack === undefined ? undefined : maskText(value.stack),
      ...fields,
    };
  }
  return fields;
}

/** Cópia do valor segura para log: segredos removidos, dados financeiros e pessoais mascarados. */
export function redact(value: unknown): unknown {
  return redactValue(value, new WeakSet(), 0);
}
