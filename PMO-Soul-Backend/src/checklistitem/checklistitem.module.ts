import { Module } from '@nestjs/common';
import { ChecklistItemController } from './checklistitem.controller';
import { ChecklistItemService } from './checklistitem.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ChecklistItemController],
  providers: [ChecklistItemService],
})
export class ChecklistItemModule {}
