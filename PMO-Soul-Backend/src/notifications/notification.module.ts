import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowGateway } from '../workflow/gateway/workflow-gateway';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationController } from './notification.controller';

/**
 * PG-09 — the in-app notification engine.
 * Exported so the workflow engine can raise notifications from a pulse.
 */
@Module({
  imports: [PrismaModule],
  controllers: [NotificationController],
  providers: [NotificationQueueService, WorkflowGateway],
  exports: [NotificationQueueService],
})
export class NotificationModule {}
