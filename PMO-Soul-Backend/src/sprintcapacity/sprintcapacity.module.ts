import { Module } from '@nestjs/common';
import { SprintCapacityController } from './sprintcapacity.controller';
import { SprintCapacityService } from './sprintcapacity.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [SprintCapacityController],
  providers: [SprintCapacityService],
})
export class SprintCapacityModule {}
