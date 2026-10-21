import { Module } from '@nestjs/common';
import { ProjectLifecycleStepController } from './projectlifecyclestep.controller';
import { ProjectLifecycleStepService } from './projectlifecyclestep.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ProjectLifecycleStepController],
  providers: [ProjectLifecycleStepService],
})
export class ProjectLifecycleStepModule {}
