import { Module } from '@nestjs/common';
import { OrganizationSettingsController } from './organizationsettings.controller';
import { OrganizationSettingsService } from './organizationsettings.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [OrganizationSettingsController],
  providers: [OrganizationSettingsService],
})
export class OrganizationSettingsModule {}
