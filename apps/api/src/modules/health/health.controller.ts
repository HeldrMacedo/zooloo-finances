import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import * as z from 'zod';
import { DatabaseService } from '../../providers/database/database.service.js';
import { ProblemException, problemForStatus } from '../../runtime/http/problem.js';

export const HealthSchema = z.object({ status: z.literal('ok') }).meta({ id: 'Health' });

/** Sondas de liveness e readiness para o orquestrador. Não exigem autenticação. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @HttpCode(200)
  @ApiOkResponse({ description: 'Processo vivo', standardSchema: HealthSchema })
  live(): z.infer<typeof HealthSchema> {
    return { status: 'ok' };
  }

  @Get('ready')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Pronto para receber tráfego', standardSchema: HealthSchema })
  @ApiServiceUnavailableResponse({ description: 'Banco de dados indisponível' })
  async ready(): Promise<z.infer<typeof HealthSchema>> {
    try {
      await this.database.ping();
    } catch {
      throw new ProblemException({
        ...problemForStatus(503),
        detail: 'Banco de dados indisponível.',
      });
    }
    return { status: 'ok' };
  }
}
