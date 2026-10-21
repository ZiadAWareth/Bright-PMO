import { Module } from '@nestjs/common';
import { IntegrationConnectionController } from './integrationconnection.controller';
import { IntegrationConnectionService } from './integrationconnection.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [IntegrationConnectionController],
  providers: [IntegrationConnectionService],
})
export class IntegrationConnectionModule {}
