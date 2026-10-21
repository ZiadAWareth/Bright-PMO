import { Module } from '@nestjs/common';
import { RolesAndPermissionsController } from './rolesandpermissions.controller';
import { RolesAndPermissionsService } from './rolesandpermissions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  // WorkflowModule: role changes trigger workflows like every other table's (PulseWorkflowRunner).
  imports: [PrismaModule, WorkflowModule],
  controllers: [RolesAndPermissionsController],
  providers: [RolesAndPermissionsService],
})
export class RolesAndPermissionsModule {}
