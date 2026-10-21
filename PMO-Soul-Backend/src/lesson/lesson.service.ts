
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { LessonLogic } from '../shared/lesson-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class LessonService {
  private readonly logic: LessonLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.lesson);
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
    this.logic = new LessonLogic(repo, hooks);
  }

  async getAllLessons(params?: {
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
  async aggregateLesson(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getLessonById(id: number) {
    return this.logic.getById(id);
  }

  async createLesson(dto: CreateLessonDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateLesson(id: number, dto: UpdateLessonDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteLesson(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: { project: true } as Prisma.LessonInclude
    });
  }

  async getSprint(id: number) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: { sprint: true } as Prisma.LessonInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: { user: true } as Prisma.LessonInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.lesson.findUnique({
      where: { id },
      include: { organization: true } as Prisma.LessonInclude
    });
  }

}
