import { Module } from '@nestjs/common';
import { ClosureTemplateItemController } from './closuretemplateitem.controller';
import { ClosureTemplateItemService } from './closuretemplateitem.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ClosureTemplateItemController],
  providers: [ClosureTemplateItemService],
})
export class ClosureTemplateItemModule {}
