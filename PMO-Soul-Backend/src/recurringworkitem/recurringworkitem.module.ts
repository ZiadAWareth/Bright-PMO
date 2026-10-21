import { Module } from '@nestjs/common';
import { RecurringWorkItemController } from './recurringworkitem.controller';
import { RecurringWorkItemService } from './recurringworkitem.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [RecurringWorkItemController],
  providers: [RecurringWorkItemService],
})
export class RecurringWorkItemModule {}
