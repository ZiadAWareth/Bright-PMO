import { Module } from '@nestjs/common';
import { ClosureTemplateController } from './closuretemplate.controller';
import { ClosureTemplateService } from './closuretemplate.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ClosureTemplateController],
  providers: [ClosureTemplateService],
})
export class ClosureTemplateModule {}
