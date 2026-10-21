import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowGateway } from '../workflow/gateway/workflow-gateway';
import { runWithTenant } from '../organization-scope/tenant-context';

const QUEUE_NAME = 'notifications';

/** This app's own namespace in the shared Redis (see the constructor). */
export function queuePrefix(): string {
  const id = String(process.env.PROJECT_ID || process.env.APP_NAME || 'app').replace(/[^A-Za-z0-9_-]/g, '');
  return 'soul:' + (id || 'app');
}

export interface NotificationPayload {
  userId: string;
  title: string;
  message?: string;
  level?: string;
  entityName?: string;
  entityRecordId?: string;
  processType?: string;
  /**
   * The recipient's organization. null ONLY for a platform user (an account outside every
   * organization): their inbox is not tenant-filtered, so they read it back. A tenant user's
   * notification must carry their organization: the tenant filter never matches NULL.
   */
  organizationId: number | null;
  metadata?: Record<string, unknown>;
}

/**
 * Durable in-app notification delivery.
 *
 * Enqueue -> worker persists the Notification, then pushes it over the websocket.
 * Delivery durability is owned by BullMQ (bounded retries + a failed set); a
 * transport error rethrows so the job retries rather than disappearing.
 */
@Injectable()
export class NotificationQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationQueueService.name);
  private readonly connection: IORedis;
  private readonly queue: Queue;
  private readonly worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: WorkflowGateway,
  ) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

    // Every app shares the central Redis. Under BullMQ's default prefix they all shared ONE
    // "notifications" queue too, so each app's worker took other apps' jobs and wrote them into
    // its OWN database: a notification reached its bell only when the right app happened to win
    // the job, and could land with a same-numbered user in another app. The prefix gives every
    // app its own queue.
    const prefix = queuePrefix();
    if (!process.env.PROJECT_ID) {
      this.logger.warn(
        `PROJECT_ID is not set: notifications use the queue "${prefix}", which another app without a PROJECT_ID would share. Set PROJECT_ID in .env.`,
      );
    }
    this.queue = new Queue(QUEUE_NAME, { connection: this.connection as any, prefix });
    this.worker = new Worker(QUEUE_NAME, async (job) => this.process(job.data), {
      connection: this.connection as any,
      concurrency: 5,
      prefix,
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Notification job ${job?.id} failed: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.worker.close();
      await this.queue.close();
      await this.connection.quit();
    } catch (err: any) {
      this.logger.warn(`Notification queue shutdown: ${err?.message}`);
    }
  }

  /** Queue a notification. Bounded retries with exponential backoff. */
  async enqueue(payload: NotificationPayload): Promise<void> {
    if (!payload?.userId) {
      throw new Error('enqueue: a notification requires a userId');
    }
    // Checked here, at the point of entry, rather than in the worker: a job that
    // has already been accepted can only fail asynchronously, where the caller
    // that knew the tenant is long gone.
    // null is allowed (a platform user's notification); a missing value is not.
    if (payload.organizationId === undefined) {
      throw new Error('enqueue: a notification requires an organizationId (null for a platform user)');
    }
    await this.queue.add('notify', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  private async process(data: NotificationPayload): Promise<void> {
    // The worker runs outside any request, so it carries no ambient tenant and
    // the Prisma middleware would wave the write through unscoped. Establishing
    // the context makes the middleware stamp and enforce the tenant, so the row
    // is scoped by the same rule that guards every other write.
    // A platform user's notification has no tenant to stamp, so it is written as trusted system
    // work rather than with an empty context.
    const tenant = data.organizationId != null ? { organizationId: data.organizationId } : { system: true };
    const record = await runWithTenant(tenant, () =>
      this.prisma.notification.create({
      data: {
        userId: data.userId,
        organizationId: data.organizationId,
        title: data.title,
        message: data.message,
        channel: 'in_app',
        level: data.level ?? 'info',
        entityName: data.entityName,
        entityRecordId: data.entityRecordId,
        processType: data.processType,
        metadata: (data.metadata ?? undefined) as any,
      },
      }),
    );

    // Deliver to this recipient's room only. Broadcasting put every
    // notification's title and message on every connected socket, in every
    // tenant, and left it to each client to discard what was not theirs.
    // If it throws, rethrow so BullMQ retries the whole job (bounded by
    // `attempts`) — the durability lives in the queue.
    this.gateway.pushToUser(record.userId, 'notification.new', {
      id: record.id,
      userId: record.userId,
      title: record.title,
      message: record.message,
      level: record.level,
      entityName: record.entityName,
      entityRecordId: record.entityRecordId,
      createdAt: record.createdAt,
    });
  }
}
