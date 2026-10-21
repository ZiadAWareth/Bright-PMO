import {
  All,
  Body,
  Controller,
  HttpCode,
  MethodNotAllowedException,
  NotFoundException,
  Param,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { PulseWorkflowRunner } from './pulses/services/pulse-live-runner';
import { runWithTenant } from '../organization-scope/tenant-context';
import { scrubWebhookHeaders, secretMatches, webhookTrigger } from './clock-rules';
import { buildTriggerInput } from './pulses/core';
import { meta as webhookMeta } from './pulses/catalog/triggers/webhook/webhook.pulse';

/**
 * The receive endpoint behind trigger.webhook: /api/webhooks/:path
 *
 * PUBLIC BY DESIGN — no AuthGuard. The caller is another system, not a user of this app, and it
 * proves itself with the trigger's secret (header x-webhook-secret, or ?secret= for callers that
 * cannot set headers), compared in constant time. A path with no secret configured is open; the
 * designer chose that. The run itself is started under the workflow's own tenant, never under
 * whatever the request carried.
 *
 * The path is matched against the ACTIVE workflows in code (no lookup table): the set is small,
 * and activation already refuses a path another active workflow uses, so at most one matches.
 *
 * Body size is whatever the app's body parser allows (Express default, 100 kb). The response is
 * sent when the run finishes or parks, so the caller gets a real status, not a promise.
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: PulseWorkflowRunner,
  ) {}

  @All(':path')
  @HttpCode(202)
  @ApiOperation({ summary: 'Start the workflow listening on this webhook path' })
  @ApiParam({ name: 'path', description: 'The path configured on the workflow trigger' })
  async receive(
    @Param('path') path: string,
    @Body() body: unknown,
    @Query() query: Record<string, unknown>,
    @Req() req: any,
  ) {
    const method = String(req?.method ?? 'POST').toUpperCase();
    const workflows: any[] = await (this.prisma as any).workflow.findMany({ where: { status: 'ACTIVE' } });
    const match = workflows
      .map((wf) => ({ wf, hook: webhookTrigger(wf.definition) }))
      .find((m) => m.hook && m.hook.path === path);
    if (!match || !match.hook) {
      throw new NotFoundException('No active workflow listens on this webhook path.');
    }
    if (match.hook.method !== method) {
      throw new MethodNotAllowedException('This webhook accepts ' + match.hook.method + ' only.');
    }
    if (match.hook.secret) {
      const provided = req?.headers?.['x-webhook-secret'] ?? query?.secret;
      if (!secretMatches(match.hook.secret, provided)) {
        throw new UnauthorizedException('Invalid webhook secret.');
      }
    }

    // Shaped by the trigger's own declaration (pulses/core/trigger-input): the same builder Test
    // flow and the designer's Simulate use, so a test is shaped exactly like this call. It also
    // drops ?secret= from the query, so the secret never lands in the run.
    const data = buildTriggerInput(webhookMeta.triggerInput!, match.hook, {
      payload: body ?? {},
      headers: scrubWebhookHeaders(req?.headers),
      query: query ?? {},
      method,
    });
    const result = await runWithTenant({ organizationId: match.wf.organizationId ?? undefined }, () =>
      this.runner.execute(match.wf, 'webhook', data),
    );
    return { runId: result.runId, status: result.status };
  }
}
