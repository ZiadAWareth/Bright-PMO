import { Module } from '@nestjs/common';
import { ProjectMemberController } from './projectmember.controller';
import { ProjectMemberService } from './projectmember.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [ProjectMemberController],
  providers: [ProjectMemberService],
})
export class ProjectMemberModule {}
