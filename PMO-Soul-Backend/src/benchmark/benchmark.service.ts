
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBenchmarkDto } from './dto/create-benchmark.dto';
import { UpdateBenchmarkDto } from './dto/update-benchmark.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { BenchmarkLogic } from '../shared/benchmark-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class BenchmarkService {
  private readonly logic: BenchmarkLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.benchmark);
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
    this.logic = new BenchmarkLogic(repo, hooks);
  }

  async getAllBenchmarks(params?: {
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
  async aggregateBenchmark(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getBenchmarkById(id: number) {
    return this.logic.getById(id);
  }

  async createBenchmark(dto: CreateBenchmarkDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateBenchmark(id: number, dto: UpdateBenchmarkDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteBenchmark(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getProjectCategory(id: number) {
    return this.prisma.benchmark.findUnique({
      where: { id },
      include: { projectcategory: true } as Prisma.BenchmarkInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.benchmark.findUnique({
      where: { id },
      include: { organization: true } as Prisma.BenchmarkInclude
    });
  }

}
