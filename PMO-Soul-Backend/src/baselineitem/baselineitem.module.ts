import { Module } from '@nestjs/common';
import { BaselineItemController } from './baselineitem.controller';
import { BaselineItemService } from './baselineitem.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [BaselineItemController],
  providers: [BaselineItemService],
})
export class BaselineItemModule {}
