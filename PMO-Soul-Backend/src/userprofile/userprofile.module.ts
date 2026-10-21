import { Module } from '@nestjs/common';
import { UserProfileController } from './userprofile.controller';
import { UserProfileService } from './userprofile.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [UserProfileController],
  providers: [UserProfileService],
})
export class UserProfileModule {}
