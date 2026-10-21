import { Module } from '@nestjs/common';
import { ProjectConflictController } from './projectconflict.controller';
import { ProjectConflictService } from './projectconflict.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ProjectConflictController],
  providers: [ProjectConflictService],
})
export class ProjectConflictModule {}
