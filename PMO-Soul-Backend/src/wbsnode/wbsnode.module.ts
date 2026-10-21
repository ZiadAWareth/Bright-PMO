import { Module } from '@nestjs/common';
import { WbsNodeController } from './wbsnode.controller';
import { WbsNodeService } from './wbsnode.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [WbsNodeController],
  providers: [WbsNodeService],
})
export class WbsNodeModule {}
