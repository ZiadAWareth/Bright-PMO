import { Module } from '@nestjs/common';
import { PunchListItemController } from './punchlistitem.controller';
import { PunchListItemService } from './punchlistitem.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [PunchListItemController],
  providers: [PunchListItemService],
})
export class PunchListItemModule {}
