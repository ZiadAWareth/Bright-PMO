
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { SiteLogic } from '../shared/site-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class SiteService {
  private readonly logic: SiteLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.site);
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
    this.logic = new SiteLogic(repo, hooks);
  }

  async getAllSites(params?: {
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
  async aggregateSite(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getSiteById(id: number) {
    return this.logic.getById(id);
  }

  async createSite(dto: CreateSiteDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateSite(id: number, dto: UpdateSiteDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteSite(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProject(id: number) {
    return this.prisma.site.findUnique({
      where: { id },
      include: { project: true } as Prisma.SiteInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.site.findUnique({
      where: { id },
      include: { user: true } as Prisma.SiteInclude
    });
  }

  async getEquipmentSiteLogs(id: number) {
    return this.prisma.site.findUnique({
      where: { id },
      include: { equipmentsitelogs: true } as Prisma.SiteInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.site.findUnique({
      where: { id },
      include: { organization: true } as Prisma.SiteInclude
    });
  }

}
