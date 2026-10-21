import { Module } from '@nestjs/common';
import { IdpInboxEventController } from './idpinboxevent.controller';
import { IdpInboxEventService } from './idpinboxevent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [IdpInboxEventController],
  providers: [IdpInboxEventService],
})
export class IdpInboxEventModule {}
