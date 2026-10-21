import { Module } from '@nestjs/common';
import { BudgetLineController } from './budgetline.controller';
import { BudgetLineService } from './budgetline.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [BudgetLineController],
  providers: [BudgetLineService],
})
export class BudgetLineModule {}
