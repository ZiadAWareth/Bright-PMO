
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEquipmentSiteLogDto } from './dto/create-equipmentsitelog.dto';
import { UpdateEquipmentSiteLogDto } from './dto/update-equipmentsitelog.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { EquipmentSiteLogLogic } from '../shared/equipmentsitelog-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class EquipmentSiteLogService {
  private readonly logic: EquipmentSiteLogLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.equipmentSiteLog);
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
    this.logic = new EquipmentSiteLogLogic(repo, hooks);
  }

  async getAllEquipmentSiteLogs(params?: {
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
  async aggregateEquipmentSiteLog(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getEquipmentSiteLogById(id: number) {
    return this.logic.getById(id);
  }

  async createEquipmentSiteLog(dto: CreateEquipmentSiteLogDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateEquipmentSiteLog(id: number, dto: UpdateEquipmentSiteLogDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteEquipmentSiteLog(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getResource(id: number) {
    return this.prisma.equipmentSiteLog.findUnique({
      where: { id },
      include: { resource: true } as Prisma.EquipmentSiteLogInclude
    });
  }

  async getSite(id: number) {
    return this.prisma.equipmentSiteLog.findUnique({
      where: { id },
      include: { site: true } as Prisma.EquipmentSiteLogInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.equipmentSiteLog.findUnique({
      where: { id },
      include: { user: true } as Prisma.EquipmentSiteLogInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.equipmentSiteLog.findUnique({
      where: { id },
      include: { organization: true } as Prisma.EquipmentSiteLogInclude
    });
  }

}
