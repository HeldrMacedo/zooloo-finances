import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiHeader,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  type SyncPullQuery,
  SyncPullQuerySchema,
  type SyncPullResponse,
  SyncPullResponseSchema,
  type SyncPushRequest,
  SyncPushRequestSchema,
  type SyncPushResponse,
  SyncPushResponseSchema,
} from '@zooloo/validation';
import { currentWallMs } from '../../providers/clock.js';
import { CurrentUser, CurrentUserGuard, DEV_USER_HEADER } from '../../runtime/http/current-user.js';
import { SyncService } from './sync.service.js';

/** Sync delta (doc 07 §4): push do outbox e pull por versão. */
@ApiTags('sync')
@ApiHeader({ name: DEV_USER_HEADER, description: 'Provisório, só em desenvolvimento (ADR-0007)' })
@ApiUnauthorizedResponse({ description: 'Usuário não identificado' })
@UseGuards(CurrentUserGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Post('push')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Lote aplicado', standardSchema: SyncPushResponseSchema })
  @ApiUnprocessableEntityResponse({ description: 'Lote mal formado' })
  push(
    @CurrentUser() userId: string,
    @Body({ schema: SyncPushRequestSchema }) body: SyncPushRequest,
  ): Promise<SyncPushResponse> {
    return this.sync.push(userId, body.mutations, currentWallMs());
  }

  @Get('pull')
  @ApiOkResponse({
    description: 'Mudanças depois do cursor',
    standardSchema: SyncPullResponseSchema,
  })
  pull(
    @CurrentUser() userId: string,
    @Query({ schema: SyncPullQuerySchema }) query: SyncPullQuery,
  ): Promise<SyncPullResponse> {
    return this.sync.pull(userId, query);
  }
}
