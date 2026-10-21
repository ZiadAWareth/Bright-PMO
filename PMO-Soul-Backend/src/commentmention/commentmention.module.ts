import { Module } from '@nestjs/common';
import { CommentMentionController } from './commentmention.controller';
import { CommentMentionService } from './commentmention.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [PrismaModule, WorkflowModule],
  controllers: [CommentMentionController],
  providers: [CommentMentionService],
})
export class CommentMentionModule {}
