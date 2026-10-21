import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from './workflow.service';
import { buildPulseRegistry } from './pulses/catalog';
import { checkWorkflowFile, type ImportCheck } from './workflow-import.rules';

export type { ImportCheck, ImportProblem } from './workflow-import.rules';

@Injectable()
export class WorkflowIoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflows: WorkflowService,
  ) {}

  /** Read a file and say what importing it would do. Creates nothing. */
  async check(file: unknown): Promise<ImportCheck> {
    const catalog: any = await this.workflows.getCatalog();
    const registry = buildPulseRegistry();
    return checkWorkflowFile(file, {
      entities: (catalog?.entities ?? []).map((e: any) => String(e?.name ?? e)),
      roles: (catalog?.roles ?? []).map((r: any) => String(r)),
      pulseFields: (type) => {
        const pulse: any = registry.get(type);
        return pulse ? (pulse.config ?? []) : null;
      },
      agentExists: async (id) =>
        !!(await (this.prisma as any).agent?.findUnique?.({ where: { id }, select: { id: true } }).catch(() => null)),
      workflowExists: async (name) =>
        !!(await (this.prisma as any).workflow.findFirst({ where: { name }, select: { id: true } }).catch(() => null)),
    });
  }

  /** Check, then create the workflow as a Draft. The name gets "(imported)" when it is already taken. */
  async importFile(file: unknown, nameOverride?: string) {
    const checked = await this.check(file);
    if (!checked.ok || !checked.workflow) {
      throw new BadRequestException({ error: 'ImportRefused', message: 'This file cannot be imported as it is.', problems: checked.problems });
    }
    const wf = (file as any).workflow;
    const wanted = (typeof nameOverride === 'string' && nameOverride.trim()) || checked.workflow.name;
    const name = await this.freeName(wanted);
    const created: any = await (this.workflows as any).create({
      name,
      description: checked.workflow.description,
      entityId: checked.workflow.entityName,
      entityName: checked.workflow.entityName,
      definition: { nodes: wf.definition.nodes, edges: wf.definition.edges },
    });
    return { workflow: { id: String(created.id), name: created.name, status: created.status }, problems: checked.problems };
  }

  private async freeName(wanted: string): Promise<string> {
    const taken = async (n: string) => !!(await (this.prisma as any).workflow.findFirst({ where: { name: n }, select: { id: true } }));
    if (!(await taken(wanted))) return wanted;
    for (let i = 1; i < 100; i++) {
      const candidate = wanted + (i === 1 ? ' (imported)' : ' (imported ' + i + ')');
      if (!(await taken(candidate))) return candidate;
    }
    return wanted + ' (imported ' + Date.now() + ')';
  }
}
