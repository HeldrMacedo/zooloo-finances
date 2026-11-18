import { describe, expect, it } from 'vitest';
import { createLogger, type LogRecord } from './logger.js';
import { MASKED, REDACTED } from './mask.js';

function capture(level?: 'debug' | 'info' | 'warn' | 'error') {
  const records: LogRecord[] = [];
  const logger = createLogger({
    sink: (record) => records.push(record),
    clock: () => 1_700_000_000_000,
    ...(level ? { level } : {}),
  });
  return { records, logger };
}

describe('createLogger', () => {
  it('emite registro estruturado com nível, horário e mensagem', () => {
    const { records, logger } = capture();
    logger.info('sync concluído', { changes: 3 });
    expect(records).toEqual([
      { level: 'info', time: 1_700_000_000_000, msg: 'sync concluído', changes: 3 },
    ]);
  });

  it('mascara contexto e mensagem antes do sink (teste de mascaramento, SEC-DEV-02)', () => {
    const { records, logger } = capture();
    logger.warn('login falhou para ana@x.com', { password: 'p', amount: 1, email: 'ana@x.com' });
    expect(records[0]).toEqual({
      level: 'warn',
      time: 1_700_000_000_000,
      msg: 'login falhou para a***@x.com',
      password: REDACTED,
      amount: MASKED,
      email: 'a***@x.com',
    });
  });

  it('filtra por nível mínimo (padrão info)', () => {
    const { records, logger } = capture();
    logger.debug('ruído');
    logger.error('erro');
    expect(records.map((record) => record.level)).toEqual(['error']);

    const verbose = capture('debug');
    verbose.logger.debug('detalhe');
    expect(verbose.records).toHaveLength(1);
  });

  it('child acumula bindings mascarados', () => {
    const { records, logger } = capture();
    logger.child({ requestId: 'r1', token: 't' }).child({ module: 'sync' }).info('ok');
    expect(records[0]).toEqual({
      level: 'info',
      time: 1_700_000_000_000,
      msg: 'ok',
      requestId: 'r1',
      token: REDACTED,
      module: 'sync',
    });
  });

  it('contexto não sobrescreve campos reservados', () => {
    const { records, logger } = capture();
    logger.info('mensagem', { level: 'x', time: 0, msg: 'falsa' });
    expect(records[0]).toMatchObject({ level: 'info', time: 1_700_000_000_000, msg: 'mensagem' });
  });

  it('usa Date.now quando não recebe relógio', () => {
    const records: LogRecord[] = [];
    const before = Date.now();
    createLogger({ sink: (record) => records.push(record) }).info('ok');
    expect(records[0]?.time).toBeGreaterThanOrEqual(before);
  });
});
