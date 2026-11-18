import type { LoggerService } from '@nestjs/common';
import type { Logger } from '@zooloo/security';

/** Adapta o logger mascarado de `@zooloo/security` para os logs internos do Nest (RNF-OBS-01). */
export class NestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, context?: string): void {
    this.logger.info(String(message), { context });
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error(String(message), { context, trace });
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn(String(message), { context });
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug(String(message), { context });
  }

  verbose(message: unknown, context?: string): void {
    this.logger.debug(String(message), { context });
  }
}
