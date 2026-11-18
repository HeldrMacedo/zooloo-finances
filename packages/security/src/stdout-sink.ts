import type { LogRecord, LogSink } from './logger.js';

/** Sink de produção: uma linha JSON por registro em stdout (coletado pelo OpenTelemetry/Loki). */
export const stdoutSink: LogSink = (record: LogRecord) => {
  process.stdout.write(`${JSON.stringify(record)}\n`);
};
