import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException, ConflictException, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PulseWorkflowRunner } from './pulses/services/pulse-live-runner';
import { evaluateStart, manualTriggers, canReadEntity, canWriteEntity, graphWrites, seedVariables, startAllowed } from './workflow-start.rules';
import type { StartableTrigger } from './workflow-start.rules';

/** A workflow row reduced to what a button needs to know about it. */
export interface StartableWorkflow {
  id: string;
  name: string;
  description?: string | null;
  entity?: string;
  triggers: StartableTrigger[];
}

/**
 * Starting a workflow by hand.
 *
 * Every decision lives in workflow-start.rules.ts, which has no Nest or Prisma imports and is
 * therefore testable by calling it. This class fetches, maps refusals to status codes, and runs.
 */
@Injectable()
export class WorkflowStartService {
  private readonly logger = new Logger(WorkflowStartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: PulseWorkflowRunner,
  ) {}

  /**
   * Workflows the caller may start, optionally narrowed to one entity and one surface.
   *
   * Only ACTIVE ones: offering a button for a draft would start nothing, and offering one for a
   * deactivated workflow is worse — it looks like the automation is still running.
   */
  async listStartable(
    permissions: any,
    isPlatformAdmin: boolean,
    entity?: string,
    source?: string,
  ): Promise<StartableWorkflow[]> {
    const rows: any[] = await (this.prisma as any).workflow.findMany({
      where: { status: 'ACTIVE' as any },
      select: { id: true, name: true, description: true, entityName: true, definition: true },
    });

    const out: StartableWorkflow[] = [];
    for (const row of rows) {
      const triggers = manualTriggers(row.definition, row.entityName).filter((t) => {
        if (entity && String(t.entity ?? '').toLowerCase() !== entity.toLowerCase()) return false;
        if (source && t.source !== source) return false;
        return canReadEntity(permissions, isPlatformAdmin, t.entity);
      });
      if (triggers.length) {
        out.push({
          id: row.id,
          name: row.name,
          description: row.description,
          entity: row.entityName ?? undefined,
          triggers,
        });
      }
    }
    return out;
  }

  /**
   * Start one workflow by hand.
   *
   * The record is LOADED rather than trusted from the request body. A client-supplied record
   * would let the caller hand the workflow field values the real row does not have, and the read
   * goes through PrismaService, so the tenant filter applies and a record from another
   * organisation is simply not found.
   */
  async start(
    workflowId: string,
    body: { recordId?: string | number; variables?: Record<string, unknown> },
    permissions: any,
    isPlatformAdmin: boolean,
  ) {
    const { wf, verdict, record } = await this.prepare(workflowId, body, permissions, isPlatformAdmin);
    // "Allowed when": enforced HERE, on every start — a button, a script and a direct call alike.
    const allowed = startAllowed(verdict.trigger, record);
    if (!allowed.ok) throw new ConflictException(allowed.reason);
    const data = seedVariables(record, body?.variables);
    return this.runner.execute(wf, 'manualStart', data);
  }

  /**
   * Would a start be accepted right now? The same checks as start(), without running anything —
   * so a page can grey out a button with the app's own reason instead of guessing.
   */
  async canStart(workflowId: string, recordId: string | number | undefined, permissions: any, isPlatformAdmin: boolean) {
    try {
      const { verdict, record } = await this.prepare(workflowId, { recordId }, permissions, isPlatformAdmin);
      const allowed = startAllowed(verdict.trigger, record);
      return allowed.ok ? { allowed: true } : { allowed: false, reason: allowed.reason };
    } catch (err) {
      if (err instanceof HttpException) return { allowed: false, reason: err.message };
      throw err;
    }
  }

  /** Everything start() checks before running: the workflow, the trigger, permissions, the record. */
  private async prepare(
    workflowId: string,
    body: { recordId?: string | number; variables?: Record<string, unknown> },
    permissions: any,
    isPlatformAdmin: boolean,
  ) {
    const wf: any = await (this.prisma as any).workflow.findUnique({ where: { id: workflowId } });
    if (!wf) throw new NotFoundException('Workflow not found');

    const verdict = evaluateStart(wf, {
      hasRecordId: body?.recordId != null,
      permissions,
      isPlatformAdmin,
    });
    if (!verdict.ok) {
      if (verdict.reason === 'inactive') {
        throw new BadRequestException('This workflow is not active.');
      }
      if (verdict.reason === 'notManual') {
        throw new BadRequestException('This workflow cannot be started by hand.');
      }
      throw new ForbiddenException(
        `You do not have permission to read ${verdict.entity ?? 'this entity'}.`,
      );
    }
    // A workflow that writes the entity runs those writes with the engine's own access, so the
    // person pressing Start must be allowed to write it themselves — READ alone was a loophole.
    if (graphWrites(wf.definition) && !canWriteEntity(permissions, isPlatformAdmin, verdict.trigger.entity)) {
      throw new ForbiddenException(
        `This workflow changes ${verdict.trigger.entity ?? 'records'} and you do not have permission to do that.`,
      );
    }

    let record: any = undefined;
    if (body?.recordId != null && verdict.trigger.entity) {
      const entity = verdict.trigger.entity;
      const delegate = (this.prisma as any)[entity.charAt(0).toLowerCase() + entity.slice(1)];
      if (!delegate?.findUnique) {
        throw new BadRequestException(`Unknown entity ${entity}.`);
      }
      const id = /^\d+$/.test(String(body.recordId)) ? Number(body.recordId) : body.recordId;
      record = await delegate.findUnique({ where: { id } });
      if (!record) throw new NotFoundException('Record not found');
    }
    return { wf, verdict: verdict as { ok: true; trigger: StartableTrigger }, record };
  }
}
