
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaintenanceScheduleDto } from './dto/create-maintenanceschedule.dto';
import { UpdateMaintenanceScheduleDto } from './dto/update-maintenanceschedule.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { MaintenanceScheduleLogic } from '../shared/maintenanceschedule-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class MaintenanceScheduleService {
  private readonly logic: MaintenanceScheduleLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.maintenanceSchedule);
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
    this.logic = new MaintenanceScheduleLogic(repo, hooks);
  }

  async getAllMaintenanceSchedules(params?: {
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
  async aggregateMaintenanceSchedule(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getMaintenanceScheduleById(id: number) {
    return this.logic.getById(id);
  }

  async createMaintenanceSchedule(dto: CreateMaintenanceScheduleDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateMaintenanceSchedule(id: number, dto: UpdateMaintenanceScheduleDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteMaintenanceSchedule(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getResource(id: number) {
    return this.prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: { resource: true } as Prisma.MaintenanceScheduleInclude
    });
  }

  async getMaintenanceLogs(id: number) {
    return this.prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: { maintenancelogs: true } as Prisma.MaintenanceScheduleInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.maintenanceSchedule.findUnique({
      where: { id },
      include: { organization: true } as Prisma.MaintenanceScheduleInclude
    });
  }

}
