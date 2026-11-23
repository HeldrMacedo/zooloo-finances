import { Module } from '@nestjs/common';
import { CurrentUserGuard } from '../../runtime/http/current-user.js';
import { CategoryRules } from './category-rules.js';
import { SyncController } from './sync.controller.js';
import { SyncRepo } from './sync.repo.js';
import { SyncService } from './sync.service.js';

@Module({
  controllers: [SyncController],
  providers: [SyncService, SyncRepo, CategoryRules, CurrentUserGuard],
})
export class SyncModule {}
