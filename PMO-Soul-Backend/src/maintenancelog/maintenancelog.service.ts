
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceLogDto } from './dto/create-maintenancelog.dto';
import { UpdateMaintenanceLogDto } from './dto/update-maintenancelog.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { MaintenanceLogLogic } from '../shared/maintenancelog-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class MaintenanceLogService {
  private readonly logic: MaintenanceLogLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.maintenanceLog);
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
    this.logic = new MaintenanceLogLogic(repo, hooks);
  }

  async getAllMaintenanceLogs(params?: {
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
  async aggregateMaintenanceLog(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getMaintenanceLogById(id: number) {
    return this.logic.getById(id);
  }

  async createMaintenanceLog(dto: CreateMaintenanceLogDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateMaintenanceLog(id: number, dto: UpdateMaintenanceLogDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteMaintenanceLog(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getMaintenanceSchedule(id: number) {
    return this.prisma.maintenanceLog.findUnique({
      where: { id },
      include: { maintenanceschedule: true } as Prisma.MaintenanceLogInclude
    });
  }

  async getResource(id: number) {
    return this.prisma.maintenanceLog.findUnique({
      where: { id },
      include: { resource: true } as Prisma.MaintenanceLogInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.maintenanceLog.findUnique({
      where: { id },
      include: { user: true } as Prisma.MaintenanceLogInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.maintenanceLog.findUnique({
      where: { id },
      include: { organization: true } as Prisma.MaintenanceLogInclude
    });
  }

}
