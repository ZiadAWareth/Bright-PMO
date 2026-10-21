import { Module } from '@nestjs/common';
import { LifecycleTemplateController } from './lifecycletemplate.controller';
import { LifecycleTemplateService } from './lifecycletemplate.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [LifecycleTemplateController],
  providers: [LifecycleTemplateService],
})
export class LifecycleTemplateModule {}
