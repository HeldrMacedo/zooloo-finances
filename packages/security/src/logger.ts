import { maskText, redact } from './mask.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  readonly level: LogLevel;
  /** Epoch em milissegundos (UTC). */
  readonly time: number;
  readonly msg: string;
  readonly [field: string]: unknown;
}

export type LogSink = (record: LogRecord) => void;
export type LogContext = Readonly<Record<string, unknown>>;

export interface Logger {
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext): void;
  child(bindings: LogContext): Logger;
}

export interface LoggerOptions {
  readonly sink: LogSink;
  readonly level?: LogLevel;
  readonly clock?: () => number;
}

const SEVERITY: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function redactContext(context: LogContext): Record<string, unknown> {
  return redact(context) as Record<string, unknown>;
}

function build(options: LoggerOptions, bindings: Record<string, unknown>): Logger {
  const minimum = SEVERITY[options.level ?? 'info'];
  const clock = options.clock ?? Date.now;
  const emit = (level: LogLevel, msg: string, context: LogContext = {}): void => {
    if (SEVERITY[level] < minimum) {
      return;
    }
    options.sink({
      ...bindings,
      ...redactContext(context),
      level,
      time: clock(),
      msg: maskText(msg),
    });
  };
  return {
    debug: (msg, context) => emit('debug', msg, context),
    info: (msg, context) => emit('info', msg, context),
    warn: (msg, context) => emit('warn', msg, context),
    error: (msg, context) => emit('error', msg, context),
    child: (extra) => build(options, { ...bindings, ...redactContext(extra) }),
  };
}

/**
 * Único logger permitido no projeto (RNF-OBS-01): todo contexto passa por `redact` e a mensagem
 * por `maskText` antes de chegar ao sink. `console.*` é bloqueado pelo lint.
 */
export function createLogger(options: LoggerOptions): Logger {
  return build(options, {});
}
