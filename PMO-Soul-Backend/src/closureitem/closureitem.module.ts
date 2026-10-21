import { Module } from '@nestjs/common';
import { ClosureItemController } from './closureitem.controller';
import { ClosureItemService } from './closureitem.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ClosureItemController],
  providers: [ClosureItemService],
})
export class ClosureItemModule {}
