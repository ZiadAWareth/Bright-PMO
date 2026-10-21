import { Module } from '@nestjs/common';
import { BusinessUnitController } from './businessunit.controller';
import { BusinessUnitService } from './businessunit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [BusinessUnitController],
  providers: [BusinessUnitService],
})
export class BusinessUnitModule {}
