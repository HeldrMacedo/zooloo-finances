import { createLogger, type LogRecord, REDACTED } from '@zooloo/security';
import { describe, expect, it } from 'vitest';
import { NestLogger } from './nest-logger.js';

describe('NestLogger', () => {
  it('encaminha cada nível ao logger mascarado com o contexto do Nest', () => {
    const records: LogRecord[] = [];
    const logger = new NestLogger(
      createLogger({ sink: (record) => records.push(record), level: 'debug', clock: () => 0 }),
    );
    logger.log('iniciado', 'NestApplication');
    logger.warn('lento', 'Pool');
    logger.debug('detalhe', 'X');
    logger.verbose('mais detalhe', 'Y');
    logger.error('falhou Bearer abc', 'stack', 'Z');
    expect(records.map((record) => [record.level, record.msg, record['context']])).toEqual([
      ['info', 'iniciado', 'NestApplication'],
      ['warn', 'lento', 'Pool'],
      ['debug', 'detalhe', 'X'],
      ['debug', 'mais detalhe', 'Y'],
      ['error', `falhou Bearer ${REDACTED}`, 'Z'],
    ]);
    expect(records[4]?.['trace']).toBe('stack');
  });
});
