import { Module } from '@nestjs/common';
import { BaselineController } from './baseline.controller';
import { BaselineService } from './baseline.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [BaselineController],
  providers: [BaselineService],
})
export class BaselineModule {}
