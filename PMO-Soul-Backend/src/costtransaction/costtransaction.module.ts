import { Module } from '@nestjs/common';
import { CostTransactionController } from './costtransaction.controller';
import { CostTransactionService } from './costtransaction.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [CostTransactionController],
  providers: [CostTransactionService],
})
export class CostTransactionModule {}
