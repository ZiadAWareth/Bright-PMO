import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AgentToolInvocation } from './agent.runtime';

/** Everything worth keeping about one answered — or failed — question. */
export interface AgentRunFacts {
  question: string;
  /** Which surface asked. Defaults to the assistant page. */
  surface?: string;
  userId?: number;
  userEmail?: string;
  /** Denormalised from the settings row, because that row is mutable and history is not. */
  provider?: string;
  modelName?: string;
  /** `Date.now()` taken when the question arrived, so the duration includes queue time. */
  startedAt: number;
  answer?: string;
  /** Present only when the run failed. Its presence is what marks the run FAILED. */
  error?: string;
  iterations?: number;
  stoppedEarly?: boolean;
  usage?: { inputTokens: number; outputTokens: number };
  invocations?: AgentToolInvocation[];
  /**
   * The Agent row as it stood when the run started — a COPY, never a foreign key.
   *
   * Omitted by the assistant page, which has no Agent row behind it. Written by the workflow
   * step, because agents are edited in place: widening an agent's allowedEntities tomorrow must
   * not rewrite what this run's audit says it was permitted to read.
   */
  /** The Agent row this run executed, when it was a named agent rather than the app assistant.
   *  Was never written before: every run of a named agent carried its definition snapshot but
   *  no link back to the row, so "show me this agent's runs" had nothing to filter on. */
  agentId?: string | null;
  definitionSnapshot?: unknown;
}

@Injectable()
export class AgentRunStore {
  private readonly logger = new Logger(AgentRunStore.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes one run and its tool calls.
   *
   * Returns the new run's id, or null when nothing was written. Callers should not
   * branch on that: it is there for the surfaces that want to link to the run, not as
   * a status to check.
   */
  async record(facts: AgentRunFacts): Promise<string | null> {
    // An app generated before Phase 2.8 has no such table and no such delegate. Asking
    // for it would throw on every question, turning a bookkeeping gap into an outage.
    const runs = (this.prisma as any).agentRun;
    const steps = (this.prisma as any).agentRunStep;
    if (!runs?.create) return null;

    const completedAt = new Date();

    try {
      const run = await runs.create({
        data: {
          userId: facts.userId ?? null,
          userEmail: facts.userEmail ?? null,
          surface: facts.surface ?? 'assistant',
          question: facts.question,
          answer: facts.answer ?? null,
          status: facts.error ? 'FAILED' : 'COMPLETED',
          error: facts.error ?? null,
          provider: facts.provider ?? null,
          modelName: facts.modelName ?? null,
          agentId: facts.agentId ?? null,
          definitionSnapshot: (facts.definitionSnapshot ?? null) as any,
          iterations: facts.iterations ?? 0,
          stoppedEarly: facts.stoppedEarly ?? false,
          inputTokens: facts.usage?.inputTokens ?? 0,
          outputTokens: facts.usage?.outputTokens ?? 0,
          startedAt: new Date(facts.startedAt),
          completedAt,
          durationMs: completedAt.getTime() - facts.startedAt,
        },
      });

      const invocations = facts.invocations ?? [];
      if (invocations.length && steps?.createMany) {
        await steps.createMany({
          data: invocations.map((invocation, index) => ({
            runId: run.id,
            // From 1, and assigned here rather than derived from createdAt: several
            // calls in one iteration land inside the same millisecond, so a timestamp
            // cannot order them.
            seq: index + 1,
            toolName: invocation.name,
            args: (invocation.args ?? {}) as any,
            ok: invocation.ok,
            summary: invocation.summary ?? null,
            durationMs: invocation.durationMs ?? null,
          })),
        });
      }

      return run.id as string;
    } catch (err) {
      // Deliberately swallowed. The answer is already on its way to the user; failing
      // the request now would trade a missing audit row for a lost answer.
      this.logger.warn(`Could not record agent run: ${(err as Error).message}`);
      return null;
    }
  }
}
