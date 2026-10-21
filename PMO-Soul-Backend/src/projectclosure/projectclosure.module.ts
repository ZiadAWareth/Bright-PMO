import { Module } from '@nestjs/common';
import { ProjectClosureController } from './projectclosure.controller';
import { ProjectClosureService } from './projectclosure.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ProjectClosureController],
  providers: [ProjectClosureService],
})
export class ProjectClosureModule {}
