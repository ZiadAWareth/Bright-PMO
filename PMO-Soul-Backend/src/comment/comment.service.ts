
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { CommentLogic } from '../shared/comment-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class CommentService {
  private readonly logic: CommentLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.comment);
    const hooks: EntityLifecycleHooks = {
      internal: {
        // PULSE is the engine: every entity event is dispatched to the pulse
        // runner. Fire-and-forget — a workflow failure must never fail the write.
        onEntityEvent: (entityName: string, event: string, data: any) => {
          this.workflowRunner.onEntityEvent(entityName, event, data).catch((err) =>
            console.error(`Workflow trigger failed:`, err),
          );
        },
      },
    };
    this.logic = new CommentLogic(repo, hooks);
  }

  async getAllComments(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    q?: string;
    filters?: any;
  }) {
    return this.logic.getAll(params);
  }

  /** One number for a dashboard card. All five folds, one call — see shared/aggregate.ts. */
  async aggregateComment(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getCommentById(id: number) {
    return this.logic.getById(id);
  }

  async createComment(dto: CreateCommentDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateComment(id: number, dto: UpdateCommentDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteComment(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getWorkItem(id: number) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.CommentInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { user: true } as Prisma.CommentInclude
    });
  }

  async getComment(id: number) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { comment: true } as Prisma.CommentInclude
    });
  }

  async getComments(id: number) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { comments: true } as Prisma.CommentInclude
    });
  }

  async getCommentMentions(id: number) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { commentmentions: true } as Prisma.CommentInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.comment.findUnique({
      where: { id },
      include: { organization: true } as Prisma.CommentInclude
    });
  }

}
