
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { Prisma } from '@prisma/client';
import { PulseWorkflowRunner } from '../workflow/pulses/services/pulse-live-runner';
import { DocumentLogic } from '../shared/document-logic';
import type { AggregateRequest, AggregateResponse } from '../shared/aggregate';
import { PrismaRepository } from '../shared/repository';
import { EntityLifecycleHooks } from '../shared/hooks';


@Injectable()
export class DocumentService {
  private readonly logic: DocumentLogic;

  constructor(
    private prisma: PrismaService,
    private workflowRunner: PulseWorkflowRunner
  ) {
    const repo = new PrismaRepository(this.prisma.document);
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
    this.logic = new DocumentLogic(repo, hooks);
  }

  async getAllDocuments(params?: {
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
  async aggregateDocument(request: AggregateRequest): Promise<AggregateResponse> {
    return this.logic.aggregate(request);
  }

  async getDocumentById(id: number) {
    return this.logic.getById(id);
  }

  async createDocument(dto: CreateDocumentDto, userId: number, applicationId?: string) {
    return this.logic.create(dto, userId, applicationId);
  }

  async updateDocument(id: number, dto: UpdateDocumentDto, userId: number, applicationId?: string) {
    return this.logic.update(id, dto, userId, applicationId);
  }

  async deleteDocument(id: number, applicationId?: string) {
    return this.logic.remove(id, applicationId);
  }

  
  async getDocument(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { document: true } as Prisma.DocumentInclude
    });
  }

  async getDocumentPreviousVersion(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { documentPreviousVersion: true } as Prisma.DocumentInclude
    });
  }

  async getProject(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { project: true } as Prisma.DocumentInclude
    });
  }

  async getWbsNode(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { wbsnode: true } as Prisma.DocumentInclude
    });
  }

  async getWorkItem(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { workitem: true } as Prisma.DocumentInclude
    });
  }

  async getUser(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { user: true } as Prisma.DocumentInclude
    });
  }

  async getOrganization(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { organization: true } as Prisma.DocumentInclude
    });
  }

  async getClosureItems(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { closureitems: true } as Prisma.DocumentInclude
    });
  }

  async getHandovers(id: number) {
    return this.prisma.document.findUnique({
      where: { id },
      include: { handovers: true } as Prisma.DocumentInclude
    });
  }

}
