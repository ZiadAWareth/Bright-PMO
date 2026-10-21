import { Module } from '@nestjs/common';
import { RfqResponseController } from './rfqresponse.controller';
import { RfqResponseService } from './rfqresponse.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [RfqResponseController],
  providers: [RfqResponseService],
})
export class RfqResponseModule {}
