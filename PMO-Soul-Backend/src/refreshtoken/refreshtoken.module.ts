import { Module } from '@nestjs/common';
import { RefreshTokenController } from './refreshtoken.controller';
import { RefreshTokenService } from './refreshtoken.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [RefreshTokenController],
  providers: [RefreshTokenService],
})
export class RefreshTokenModule {}
