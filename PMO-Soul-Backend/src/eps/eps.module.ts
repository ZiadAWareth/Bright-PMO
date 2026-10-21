import { Module } from '@nestjs/common';
import { EpsController } from './eps.controller';
import { EpsService } from './eps.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [EpsController],
  providers: [EpsService],
})
export class EpsModule {}
