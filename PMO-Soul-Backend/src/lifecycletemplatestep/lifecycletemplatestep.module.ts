import { Module } from '@nestjs/common';
import { LifecycleTemplateStepController } from './lifecycletemplatestep.controller';
import { LifecycleTemplateStepService } from './lifecycletemplatestep.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [LifecycleTemplateStepController],
  providers: [LifecycleTemplateStepService],
})
export class LifecycleTemplateStepModule {}
