
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefreshTokenDto } from './dto/create-refreshtoken.dto';
import { UpdateRefreshTokenDto } from './dto/update-refreshtoken.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { RefreshTokenLogic } from '../shared/refreshtoken-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class RefreshTokenService {
  private readonly logic: RefreshTokenLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.refreshToken);
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
    this.logic = new RefreshTokenLogic(repo, hooks);
  }

  async getAllRefreshTokens(params?: {
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
  async aggregateRefreshToken(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getRefreshTokenById(id: number) {
    return this.logic.getById(id);
  }

  async createRefreshToken(dto: CreateRefreshTokenDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateRefreshToken(id: number, dto: UpdateRefreshTokenDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteRefreshToken(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getUser(id: number) {
    return this.prisma.refreshToken.findUnique({
      where: { id },
      include: { user: true } as Prisma.RefreshTokenInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.refreshToken.findUnique({
      where: { id },
      include: { organization: true } as Prisma.RefreshTokenInclude
    });
  }

}
