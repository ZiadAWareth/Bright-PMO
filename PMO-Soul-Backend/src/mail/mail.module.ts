import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

/**
 * Imports Prisma and NOTHING else, on purpose. Both AuthModule (invites, one-time codes) and
 * WorkflowModule (the send-email step) import this one, so anything it imported back would be a
 * cycle waiting to happen.
 */
@Module({
  imports: [PrismaModule],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
