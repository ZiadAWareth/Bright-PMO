import { Module } from '@nestjs/common';
import { ProjectCategoryController } from './projectcategory.controller';
import { ProjectCategoryService } from './projectcategory.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ProjectCategoryController],
  providers: [ProjectCategoryService],
})
export class ProjectCategoryModule {}
