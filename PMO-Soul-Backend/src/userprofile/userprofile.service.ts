
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserProfileDto } from './dto/create-userprofile.dto';
import { UpdateUserProfileDto } from './dto/update-userprofile.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { UserProfileLogic } from '../shared/userprofile-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class UserProfileService {
  private readonly logic: UserProfileLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.userProfile);
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
    this.logic = new UserProfileLogic(repo, hooks);
  }

  async getAllUserProfiles(params?: {
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
  async aggregateUserProfile(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getUserProfileById(id: number) {
    return this.logic.getById(id);
  }

  async createUserProfile(dto: CreateUserProfileDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateUserProfile(id: number, dto: UpdateUserProfileDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteUserProfile(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getUser(id: number) {
    return this.prisma.userProfile.findUnique({
      where: { id },
      include: { user: true } as Prisma.UserProfileInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.userProfile.findUnique({
      where: { id },
      include: { organization: true } as Prisma.UserProfileInclude
    });
  }

}
