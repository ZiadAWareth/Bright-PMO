import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmMessage } from './llm.client';

/**
 * How many past turns are replayed into a new question.
 *
 * A thread has no natural end, so without a cap every later turn in a long conversation
 * costs more than the last one and the bill grows without anyone choosing it. Twelve is
 * six exchanges — comfortably more than the "and what about last month?" follow-ups this
 * exists to serve, while keeping the replay cost flat and predictable.
 */
const HISTORY_TURNS = 12;

/** Titles are for a sidebar list, not for reading. */
const TITLE_MAX = 80;

export interface ConversationTurn {
  question: string;
  answer: string;
  /** The run that produced the answer, so a UI can offer "how did you work that out?". */
  runId?: string | null;
  /** The finished "Sources" line, e.g. `Ticket (7 rows)`. Stored on the turn so a reopened
   *  thread shows the same provenance as the live answer did, rather than bare prose. */
  sources?: string | null;
}

@Injectable()
export class AgentConversationStore {
  constructor(private readonly prisma: PrismaService) {}

  private get conversations(): any {
    // An app generated before Phase 2.9 has no such delegate. Asking for it directly would
    // throw `cannot read property of undefined`, which says nothing about the real cause.
    const delegate = (this.prisma as any).agentConversation;
    if (!delegate) {
      throw new NotFoundException(
        'This app was generated before conversation history was added. Regenerate it to enable threads.',
      );
    }
    return delegate;
  }

  private get messages(): any {
    return (this.prisma as any).agentMessage;
  }

  /**
   * Loads a thread the caller owns, or throws.
   *
   * The `userId` in the filter is the whole access-control story for threads. It is applied
   * to platform admins too: administering an app is not a reason to read its users' questions.
   */
  private async ownedOrThrow(conversationId: string, userId?: number) {
    const conversation = await this.conversations.findFirst({
      where: { id: conversationId, userId: userId ?? null },
    });
    if (!conversation) {
      // Deliberately the same response as a thread that does not exist. Distinguishing the
      // two would confirm the existence of other people's conversations by id.
      throw new NotFoundException('Conversation not found.');
    }
    return conversation;
  }

  /**
   * The past turns to replay, oldest first, in the shape the runtime splices after the
   * system prompt.
   *
   * Only user and assistant turns are stored, so this is exactly what comes back — no tool
   * calls, no tool results, and no stored system prompt. See the schema appender for why.
   */
  async history(conversationId: string, userId?: number): Promise<LlmMessage[]> {
    await this.ownedOrThrow(conversationId, userId);

    // Taken from the END of the thread — the recent turns are the ones a follow-up refers
    // to — then flipped back into reading order, because a model reasons forwards.
    const recent = await this.messages.findMany({
      where: { conversationId },
      orderBy: { seq: 'desc' },
      take: HISTORY_TURNS,
    });

    return recent
      .reverse()
      .map((message: any) => ({
        role: message.role === 'assistant' ? 'assistant' : 'user',
        content: message.content,
      })) as LlmMessage[];
  }

  /** Starts a thread, titled from the question that opened it. */
  async start(input: { question: string; surface?: string; userId?: number; userEmail?: string }) {
    const title = input.question.trim().slice(0, TITLE_MAX);
    return this.conversations.create({
      data: {
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        surface: input.surface ?? 'assistant',
        title: title || null,
      },
    });
  }

  /**
   * Appends one completed exchange.
   *
   * The two messages are written together with the `updatedAt` bump inside a transaction:
   * a thread holding a question with no answer is a thread that will replay a dangling user
   * turn forever, and the model would try to answer it a second time.
   */
  async appendTurn(conversationId: string, turn: ConversationTurn): Promise<void> {
    const last = await this.messages.findFirst({
      where: { conversationId },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });
    const seq = (last?.seq ?? 0) + 1;

    await this.prisma.$transaction([
      this.messages.create({
        data: { conversationId, seq, role: 'user', content: turn.question },
      }),
      this.messages.create({
        data: {
          conversationId,
          seq: seq + 1,
          role: 'assistant',
          content: turn.answer,
          runId: turn.runId ?? null,
          // Empty string means "ran, read nothing" — a legitimate outcome for a question the
          // model answered from the grounding pack alone. Normalised to null so the UI has one
          // "no sources" case to render instead of two.
          sources: turn.sources || null,
        },
      }),
      // Touches updatedAt, which is what the thread list orders by — without it a thread
      // would sink down the list while it was being actively used. Set explicitly rather
      // than relying on `@updatedAt` firing for an empty `data: {}`, which is a quirk of
      // the client rather than a documented guarantee.
      this.conversations.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);
  }

  /** The caller's own threads, most recently used first. */
  async list(userId?: number, take = 50) {
    return this.conversations.findMany({
      where: { userId: userId ?? null },
      orderBy: { updatedAt: 'desc' },
      take,
      select: { id: true, title: true, surface: true, createdAt: true, updatedAt: true },
    });
  }

  /** One thread with its turns, oldest first. */
  async get(conversationId: string, userId?: number) {
    const conversation = await this.ownedOrThrow(conversationId, userId);
    const messages = await this.messages.findMany({
      where: { conversationId },
      orderBy: { seq: 'asc' },
      // `sources` is selected here and nowhere else: this is the only read that rebuilds a
      // transcript for display. `history()` deliberately does NOT select it — that feeds the
      // model, and provenance is something the user is shown, not something replayed as context.
      select: {
        id: true,
        seq: true,
        role: true,
        content: true,
        runId: true,
        sources: true,
        createdAt: true,
      },
    });
    return { ...conversation, messages };
  }

  /**
   * Deletes a thread the caller owns. Messages go with it via the schema's cascade.
   *
   * The AgentRun rows do NOT go with it, by design — they are the audit trail and the token
   * bill, and those must survive a user tidying up their history.
   */
  /** A title the person chose — only on their own thread (ownedOrThrow), trimmed and bounded. */
  async rename(conversationId: string, userId: number | undefined, title: string) {
    await this.ownedOrThrow(conversationId, userId);
    const clean = String(title ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
    return this.conversations.update({
      where: { id: conversationId },
      data: { title: clean || null },
      select: { id: true, title: true, surface: true, createdAt: true, updatedAt: true },
    });
  }

  async remove(conversationId: string, userId?: number): Promise<void> {
    await this.ownedOrThrow(conversationId, userId);
    await this.conversations.delete({ where: { id: conversationId } });
  }
}
