import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  IsBoolean,
} from 'class-validator';
import { AuthGuard } from '../guards/auth.guard';
import { AuthenticatedRequest } from '../guards/types';
import { assertFeature } from '../guards/features';
import { PrismaService } from '../prisma/prisma.service';
import { getTenantContext } from '../organization-scope/tenant-context';
import { describeAiConfig } from './ai-config';
import { probeAiConfig } from './agent-health';
import { AiSettingsService } from './ai-settings.service';
import { GroundingService } from './grounding/grounding.service';
import { buildAgentTools, AGENT_TOOL_NAMES } from './agent.tools';
import { runAgent, AgentProgress } from './agent.runtime';
import { summariseSources } from './tool.contract';
import { AgentRunStore } from './agent-run.store';
import { AgentConversationStore } from './agent-conversation.store';
import { agentRateLimiter } from './rate-limit';
import { loadNamedAgent, prepareNamedAgent } from './named-agent';
import { parseAgentOutput } from './named-agent.rules';
import { AgentStepError } from '../workflow/pulses/core/agent-error';
import { webSearchSupport } from './web-search.rules';

/**
 * The AI runtime's own tables. An agent is never scoped to these — they are this feature's
 * bookkeeping, not the app's business data.
 *
 * Written down rather than derived because, unlike the app's models, these names are fixed by the
 * generator and cannot vary between apps: `RESERVED_MODULE_DIRS` already refuses a customer model
 * called `Agent`, so there is nothing for this list to go stale against.
 */
const AGENT_INTERNAL_ENTITIES = new Set([
  'ConnectorConnection',
  'DashboardEngineConnection',
  'DashboardEngineOrg',
  'EmbeddedDashboard',
  'Agent',
  'AgentSetting',
  'AgentRun',
  'AgentRunStep',
  'AgentConversation',
  'AgentMessage',
  // Auto-number bookkeeping (per organization, per table): counters, not business data.
  'AutoNumberCounter',
]);

/**
 * Every field optional: the form saves whatever the admin changed. The global
 * ValidationPipe runs with `forbidNonWhitelisted`, so anything not declared here
 * is rejected rather than quietly written.
 */
export class AgentConfigDto {
  @ApiPropertyOptional({ description: 'groq | openai | anthropic | xai | openrouter | azure | custom' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  provider?: string;

  @ApiPropertyOptional({ description: 'Model id. Blank falls back to the provider default.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  model?: string;

  @ApiPropertyOptional({ description: 'Required for azure and custom providers.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'Omit to keep the stored key. Send an empty string to remove it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  apiKey?: string;

  @ApiPropertyOptional({ description: 'Let the Assistant page search the web through the provider (OpenAI or Anthropic).' })
  @IsOptional()
  @IsBoolean()
  assistantWebSearch?: boolean;
}

/**
 * One configured agent, as written on the Agents page.
 *
 * Every field is optional so the same class serves create and update; `create` checks for the two
 * that are genuinely required rather than having two nearly-identical DTOs drift apart.
 *
 * The class-validator rules here only check SHAPE. The rules that matter — that a tool name is a
 * tool this app has, and that an entity name is an entity this app has — cannot be expressed as a
 * decorator because they depend on the running app, so they live in `assertGrantable` below. This
 * is the model that `RESERVED_MODULE_DIRS` keeps away from the generic CRUD generator, and this
 * is why: a free-text array box is how a permission ceiling gets widened by a typo.
 */
export class AgentWriteDto {
  @ApiPropertyOptional({ description: 'Shown in pickers. Required on create.' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'One line: what this agent is for.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  role?: string;

  @ApiPropertyOptional({ description: "The agent's own instructions. Required on create." })
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  instructions?: string;

  @ApiPropertyOptional({
    description:
      'Entity names this agent may read. An EMPTY array means none at all, not everything. ' +
      'Omit the field to place no ceiling.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  allowedEntities?: string[];

  @ApiPropertyOptional({
    description: 'Tool names this agent may call. An EMPTY array means none at all.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  allowedTools?: string[];

  @ApiPropertyOptional({
    description: "May this agent search the web, using the provider's own search on the app's key?",
  })
  @IsOptional()
  @IsBoolean()
  webSearch?: boolean;

  @ApiPropertyOptional({ description: 'Overrides the app model for this agent only.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  modelOverride?: string;

  @ApiPropertyOptional({ description: 'Model round-trips allowed per run. 1–8.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  maxIterations?: number;

  @ApiPropertyOptional({
    description:
      'JSON Schema the answer must match, so a gateway can branch on a typed field instead of ' +
      'on prose. Null removes it.',
  })
  @IsOptional()
  @IsObject()
  outputSchema?: Record<string, unknown> | null;
}

/** Renaming one of your own assistant threads. */
export class RenameConversationDto {
  @ApiProperty({ description: 'The new title.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;
}

export class AgentAskDto {
  @ApiProperty({ description: 'The question, in plain language.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  question!: string;

  @ApiPropertyOptional({
    description: 'Extra instructions appended to the built-in prompt, e.g. what surface is asking.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  systemPrompt?: string;

  @ApiPropertyOptional({
    description: 'Which surface is asking — assistant, panel, pulse. Recorded against the run.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  surface?: string;

  @ApiPropertyOptional({
    description:
      'Continue an existing thread. Omit to start a new one; the id comes back on every answer.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  conversationId?: string;

  @ApiPropertyOptional({
    description:
      'Ask a specific agent from the Agents page, under its instructions and ceilings, rather ' +
      'than the app assistant. Unknown ids are refused, never quietly downgraded to the assistant.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  agentId?: string;
}

@ApiTags('Agent')
@ApiBearerAuth()
@Controller('agent')
export class AgentController {
  constructor(
    private readonly grounding: GroundingService,
    private readonly settings: AiSettingsService,
    private readonly prisma: PrismaService,
    private readonly runs: AgentRunStore,
    private readonly threads: AgentConversationStore,
  ) {}

  /**
   * Guard for the routes that read or spend the app's provider key, and for the routes that
   * write an agent's permission ceiling.
   *
   * `isPlatformAdmin` alone is NOT enough: it means organization 0 — a Soul operator — and the
   * app's own Super Admin is not one, so gating on it locks the actual owner out of their own
   * settings. The real question is "does this person administer this app", and the honest
   * expression of that is permission to change roles and permissions: whoever decides who may
   * do what here is the administrator, whatever the role is called.
   */
  // The role's "AI provider & agents" switch (src/guards/features.ts). It covers the agent routes
  // too, so the refusal names the switch rather than the provider page.
  private assertAdmin(request: AuthenticatedRequest): void {
    assertFeature(request, 'aiSettings');
  }

  // The role's "Use the assistant" switch. Every question spends the app's AI credit, which is why
  // asking is a switch and not something every signed-in person can do.
  private assertAssistant(request: AuthenticatedRequest): void {
    assertFeature(request, 'assistant');
  }

  /**
   * Reports whether the assistant is usable. Deliberately makes NO outbound request, so it is
   * safe to call on every page load, and it stays correct while the agent is dormant.
   *
   * Returns the narrow description on purpose: the key hint and the identity of whoever last
   * changed the settings are admin-only, and this route is called by everyone.
   */
  @Get('health')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Is the in-app agent configured? Makes no outbound call.' })
  async health() {
    const cfg = await this.settings.getConfig();
    return {
      ...describeAiConfig(cfg),
      // Both, so the Assistant page can say "web search on" or "unavailable for this provider"
      // rather than guessing from the provider name.
      assistantWebSearch: cfg.assistantWebSearch,
      webSearchSupported: webSearchSupport(cfg) !== null,
    };
  }

  /** The full picture behind the settings form: current values, where they came from, and
   *  the list of providers the app supports, so the frontend keeps no copy of that list. */
  @Get('config')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Current AI provider settings. Never returns the key.' })
  async getConfig(@Req() request: AuthenticatedRequest) {
    this.assertAdmin(request);
    return this.settings.describe();
  }

  /**
   * Saves the provider settings and the BYO key.
   *
   * The key is encrypted before it is written and is never readable over HTTP afterwards — the
   * response comes back through the same masked view as GET, so a compromised admin session
   * cannot be used to exfiltrate a key that was set by someone else.
   */
  @Put('config')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Save AI provider settings (platform administrators only)' })
  async saveConfig(@Req() request: AuthenticatedRequest, @Body() dto: AgentConfigDto) {
    this.assertAdmin(request);
    try {
      return await this.settings.save(dto, request.userEmail);
    } catch (err) {
      // Rejections here are the admin's input being wrong — an unknown provider, an
      // unreachable base URL — not a server fault.
      throw new BadRequestException((err as Error).message);
    }
  }

  /**
   * Verifies the key really works and that the chosen model supports tool calling. BYO means
   * someone will eventually point this at a model that cannot — better to fail here, at config
   * time, than halfway through a user's conversation.
   */
  @Post('health/probe')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Live-test the provider key and tool-calling support' })
  async probe(@Req() request: AuthenticatedRequest) {
    this.assertAdmin(request);
    const cfg = await this.settings.getConfig();
    return { config: describeAiConfig(cfg), health: await probeAiConfig(cfg) };
  }

  // ── Configured agents (plan 3.10) ──────────────────────────────────────────────────────────
  //
  // These live on THIS controller rather than a generated CRUD module for two reasons. `/api/agent`
  // already belongs to the AI runtime, so a second controller would clash; and a generated module
  // would be written to `src/agent/`, overwriting the runtime itself — which is what
  // RESERVED_MODULE_DIRS now refuses outright.

  /**
   * Fields an agent's row exposes to anyone signed in.
   *
   * `instructions` is deliberately absent, and it is the ONLY field held back. The rest is either
   * already public in effect (`allowedEntities` names tables the sidebar lists anyway) or fixed
   * (`allowedTools` is three known strings). `instructions` is the customer's own writing, and it
   * is the one thing here nobody else has a reason to read.
   *
   * One shape for every caller, on purpose: a list route that returns more to some people is a
   * route the frontend will eventually be written against wrongly.
   */
  /**
   * The same failure, the same status, whichever surface asked. Codes are the documented
   * AgentStepError names; anything else is rethrown untouched.
   */
  private static toHttp(err: unknown): unknown {
    if (!(err instanceof AgentStepError)) return err;
    const status =
      err.code === 'AgentNotFound'
        ? HttpStatus.NOT_FOUND
        : err.code === 'AgentUnavailable' || err.code === 'AgentNotConfigured' || err.code === 'WebSearchUnavailable'
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.BAD_REQUEST;
    return new HttpException({ error: err.code, message: err.message }, status);
  }

  private static readonly AGENT_LIST_FIELDS = {
    id: true,
    name: true,
    role: true,
    allowedEntities: true,
    allowedTools: true,
    webSearch: true,
    modelOverride: true,
    maxIterations: true,
    outputSchema: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  /** The agent delegate, or a clear failure. An app generated before agents existed has no table,
   *  and "cannot read findMany of undefined" is not an answer anybody can act on. */
  private agentTable() {
    const table = (this.prisma as any).agent;
    if (!table?.findMany) {
      throw new HttpException(
        'This app was generated before configured agents existed. Redeploy it to use them.',
        HttpStatus.NOT_IMPLEMENTED,
      );
    }
    return table;
  }

  /**
   * Refuses a ceiling that names something this app does not have.
   *
   * REJECTING rather than dropping is the whole point. A silently-ignored tool name lets an admin
   * believe they granted a capability they did not, and a silently-ignored entity name lets them
   * believe they restricted one they did not. Both are discovered months later, by an agent
   * answering from nothing or reading more than intended.
   *
   * The entity list is read from the live grounding pack, NOT from a list baked in at generation
   * time — a baked list is correct on the day it is written and wrong after the first schema change.
   */
  private async assertGrantable(dto: AgentWriteDto): Promise<void> {
    if (dto.allowedTools?.length) {
      const known = new Set<string>(AGENT_TOOL_NAMES as readonly string[]);
      const unknown = dto.allowedTools.filter((t) => !known.has(t));
      if (unknown.length) {
        throw new BadRequestException(
          `Unknown tool(s): ${unknown.join(', ')}. This app has: ${AGENT_TOOL_NAMES.join(', ')}.`,
        );
      }
    }

    if (dto.allowedEntities?.length) {
      const known = new Set(await this.grantableEntities());
      const unknown = dto.allowedEntities.filter((e) => !known.has(e));
      if (unknown.length) {
        throw new BadRequestException(
          `Unknown entit(ies): ${unknown.join(', ')}. Check the spelling against the App Knowledge page.`,
        );
      }
    }
  }

  /**
   * The app's own tables, minus the AI runtime's bookkeeping.
   *
   * Read from the live grounding pack rather than a list fixed at generation time, so a table
   * added after this app was generated can still be named.
   *
   * The AI runtime's own tables are removed because offering them is dishonest in both directions.
   * They carry no CRUD permission entry, so for an ordinary caller the grounding filter denies
   * them whatever the ceiling says — an administrator who ticks `AgentMessage` grants nothing and
   * is told nothing. For a platform operator, whose permissions are not consulted, the same tick
   * WOULD expose every stored conversation. A checkbox that means two different things depending
   * on who runs the agent is not a checkbox anyone can reason about.
   *
   * ONE list serves both the form and the write validation on purpose: if the offered set and the
   * accepted set could differ, the page would eventually refuse to show a value it had itself
   * stored.
   */
  private async grantableEntities(): Promise<string[]> {
    const pack = await this.grounding.getPack();
    return pack.schema.entities
      .map((e: { name: string }) => e.name)
      .filter((name: string) => !AGENT_INTERNAL_ENTITIES.has(name))
      .sort();
  }

  /**
   * The agents this app has. Any signed-in user, because the workflow designer's Agent picker
   * needs it and a list of agent names is not a secret.
   */
  @Get('agents')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List the configured agents (without their instructions)' })
  async listAgents() {
    return this.agentTable().findMany({
      select: AgentController.AGENT_LIST_FIELDS,
      orderBy: { name: 'asc' },
    });
  }

  /** What the Agents form may offer. Served from the app rather than hardcoded in the frontend,
   *  for the same reason the provider list is: two copies of a list is one copy that goes stale. */
  @Get('agent-options')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'The entity and tool names an agent may be granted' })
  async agentOptions() {
    return {
      entities: await this.grantableEntities(),
      tools: [...AGENT_TOOL_NAMES],
    };
  }

  /** One agent in full, instructions included. Admin-only — this is the editor's route. */
  @Get('agents/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Read one agent in full (administrators only)' })
  async getAgent(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.assertAdmin(request);
    const agent = await this.agentTable().findFirst({ where: { id } });
    if (!agent) throw new HttpException('No such agent.', HttpStatus.NOT_FOUND);
    return agent;
  }

  @Post('agents')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create an agent (administrators only)' })
  async createAgent(@Req() request: AuthenticatedRequest, @Body() dto: AgentWriteDto) {
    this.assertAdmin(request);
    // Checked here rather than with @IsNotEmpty so one DTO can serve create and update. An agent
    // with no instructions is not a half-filled form, it is an agent that answers from nothing.
    if (!dto.name?.trim()) throw new BadRequestException('An agent needs a name.');
    if (!dto.instructions?.trim()) {
      throw new BadRequestException('An agent needs instructions describing what it is for.');
    }
    await this.assertGrantable(dto);
    return this.agentTable().create({
      data: {
        name: dto.name.trim(),
        role: dto.role?.trim() || null,
        instructions: dto.instructions.trim(),
        allowedEntities: dto.allowedEntities ?? [],
        allowedTools: dto.allowedTools ?? [],
        webSearch: dto.webSearch ?? false,
        modelOverride: dto.modelOverride?.trim() || null,
        maxIterations: dto.maxIterations ?? null,
        outputSchema: dto.outputSchema ?? null,
      },
    });
  }

  /**
   * Updates only the fields that were sent. An absent field is left alone; `allowedEntities: []`
   * is an instruction to grant nothing, and is written as such.
   */
  @Put('agents/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update an agent (administrators only)' })
  async updateAgent(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: AgentWriteDto,
  ) {
    this.assertAdmin(request);
    await this.assertGrantable(dto);
    const existing = await this.agentTable().findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new HttpException('No such agent.', HttpStatus.NOT_FOUND);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new BadRequestException('An agent needs a name.');
      data.name = dto.name.trim();
    }
    if (dto.instructions !== undefined) {
      if (!dto.instructions.trim()) throw new BadRequestException('An agent needs instructions.');
      data.instructions = dto.instructions.trim();
    }
    if (dto.role !== undefined) data.role = dto.role.trim() || null;
    if (dto.allowedEntities !== undefined) data.allowedEntities = dto.allowedEntities;
    if (dto.allowedTools !== undefined) data.allowedTools = dto.allowedTools;
    if (dto.webSearch !== undefined) data.webSearch = !!dto.webSearch;
    if (dto.modelOverride !== undefined) data.modelOverride = dto.modelOverride.trim() || null;
    if (dto.maxIterations !== undefined) data.maxIterations = dto.maxIterations;
    if (dto.outputSchema !== undefined) data.outputSchema = dto.outputSchema;

    return this.agentTable().update({ where: { id }, data });
  }

  /** Deletes the agent row. Its AgentRun history is left alone on purpose — that is the audit
   *  trail and the token bill, and neither should be erasable by tidying up a list. */
  @Delete('agents/:id')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an agent (administrators only)' })
  async deleteAgent(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.assertAdmin(request);
    const existing = await this.agentTable().findFirst({ where: { id }, select: { id: true } });
    if (!existing) throw new HttpException('No such agent.', HttpStatus.NOT_FOUND);
    await this.agentTable().delete({ where: { id } });
  }

  /**
   * What this app knows about itself: entities, fields, relations, enums, live workflows, routes,
   * and which fields are withheld. No model, no key, no tokens — Layer 1 of the plan stands alone.
   *
   * Filtered by the caller's own permissions, so this cannot be used to enumerate entities the
   * user has no access to. Every later surface reads the SAME pack through the same filter, which
   * makes this endpoint the debugging tool for the whole agent: when the assistant says something
   * wrong, the first question is always whether it knew the field existed.
   */
  @Get('grounding')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'What this app knows about itself. No AI key required.' })
  async groundingPack(@Req() request: AuthenticatedRequest) {
    return this.grounding.getPack({
      permissions: request.userPermissions,
      isPlatformAdmin: request.isPlatformAdmin,
    });
  }

  /**
   * Ask the assistant a question. This is the route that actually spends tokens.
   *
   * The grounding pack is fetched with the CALLER's permissions and handed to the tools as their
   * context, so the set of entities the model can even name is already the set this user may
   * read. That is the whole permission story for this route: there is no second check further
   * in, because a second check is a second thing that can disagree with the first.
   *
   * Tenant isolation is separate and comes from PrismaService's middleware, which scopes every
   * read — including groupBy and aggregate — by the caller's organization.
   */
  @Post('ask')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  @ApiOperation({ summary: 'Ask the in-app assistant a question about this app' })
  async ask(@Req() request: AuthenticatedRequest, @Body() dto: AgentAskDto) {
    this.assertAssistant(request);
    return this.execute(request, dto);
  }

  /**
   * The same run, reported as it happens (plan §7 Phase 2.10).
   *
   * Server-Sent Events, written by hand rather than through Nest's `@Sse()`, for one reason:
   * `@Sse()` is a GET decorator, and the browser's EventSource cannot set an Authorization
   * header. A POST read with `fetch` keeps the bearer token in the header where it belongs,
   * instead of putting it in a query string that lands in every access log.
   *
   * Events, one JSON object per `data:` line:
   *   { type: 'thinking', iteration }   — a model round-trip started
   *   { type: 'tool', invocation }      — a tool finished; same shape as in the plain response
   *   { type: 'done', ...payload }      — identical to what POST /agent/ask returns
   *   { type: 'error', message }        — the run failed after the stream was already open
   *
   * There is no separate token bill or audit path here: this route and /ask run the SAME
   * method, so a run is recorded and a thread is appended in exactly one place.
   */
  @Post('ask/stream')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Ask the assistant, streaming progress as it works' })
  async askStream(
    @Req() request: AuthenticatedRequest,
    @Body() dto: AgentAskDto,
    @Res() response: Response,
  ) {
    // Before anything is written, so a refusal is a real 403 rather than an event inside a 200.
    this.assertAssistant(request);
    // Headers are written LAZILY, on the first event. Everything that fails cheaply — no
    // provider configured, a thread that is not yours — fails before any event is sent, so
    // it still comes back as a real 400 or 404 rather than an error buried inside a 200.
    let open = false;
    const send = (payload: unknown) => {
      if (!open) {
        response.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          // Reverse proxies buffer responses by default, which would deliver the whole
          // "stream" at the end — the exact thing this route exists to avoid.
          'X-Accel-Buffering': 'no',
        });
        open = true;
      }
      response.write('data: ' + JSON.stringify(payload) + '\n\n');
    };

    try {
      const result = await this.execute(request, dto, send);
      send({ type: 'done', ...result });
    } catch (err) {
      // Nothing sent yet means the status line is still ours to write: rethrow and let Nest's
      // exception filter answer properly. Once the stream is open, a status code is no longer
      // available and the failure has to travel as an event.
      if (!open) throw err;
      send({ type: 'error', message: (err as Error).message });
    }
    response.end();
  }

  /**
   * One question, start to finish. Both /ask and /ask/stream run this — the only difference
   * between them is whether `onProgress` is wired to anything.
   */
  private async execute(
    request: AuthenticatedRequest,
    dto: AgentAskDto,
    onProgress?: (event: AgentProgress) => void,
  ) {
    const cfg = await this.settings.getConfig();
    if (!cfg.configured) {
      // A pointed message, because the fix is a specific action by a specific person: an
      // administrator setting a key on the AI Provider page. "AI unavailable" would send
      // someone to the logs for something no log can explain.
      throw new BadRequestException(
        'The assistant has no AI provider configured. An administrator can set one on the AI Provider page.',
      );
    }

    // Checked here, after the config check and before any token is spent, so that /ask and
    // /ask/stream cannot end up with two different limits. On the streaming route this throws
    // before the first event, so the caller gets a real 429 rather than an error inside a 200.
    //
    // Keyed per user, not per app: the point is to stop ONE person exhausting a key everyone
    // shares, and an app-wide cap would let the first busy user lock out their colleagues.
    const gate = agentRateLimiter.take(String(request.userId ?? request.userEmail ?? 'anonymous'));
    if (!gate.allowed) {
      throw new HttpException(
        `You have reached the limit of ${gate.reason}. Try again in ${gate.retryAfterSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // A NAMED agent — one built on the Agents page — runs under its own instructions and ceilings,
    // applied by the same function the workflow step uses, so a page and a workflow can never
    // disagree about what it may do. Its failures (unknown id, no tools, no provider) are the same
    // AgentStepError codes a designer sees, mapped to HTTP here.
    let named: Awaited<ReturnType<typeof prepareNamedAgent>> | null = null;
    let namedAgent: Awaited<ReturnType<typeof loadNamedAgent>> | null = null;
    if (dto.agentId) {
      try {
        namedAgent = await loadNamedAgent(this.prisma, { agentId: dto.agentId });
        named = await prepareNamedAgent({
          prisma: this.prisma,
          grounding: this.grounding,
          cfg,
          agent: namedAgent,
          // AuthGuard has already refused anonymous callers; the request type keeps these optional
          // for routes that are not guarded, which this one is.
          principal: {
            id: Number(request.userId),
            email: request.userEmail,
            permissions: request.userPermissions ?? {},
            isPlatformAdmin: request.isPlatformAdmin,
          },
          task: dto.question,
          organizationId: getTenantContext()?.organizationId,
        });
      } catch (err) {
        throw AgentController.toHttp(err);
      }
    }

    const grounding = named
      ? named.options.context.grounding
      : await this.grounding.getPack({
          permissions: request.userPermissions,
          isPlatformAdmin: request.isPlatformAdmin,
        });

    // Ownership is checked BEFORE the model runs. An id that is not the caller's own is a 404,
    // and discovering that after the tokens are spent bills the customer for an answer that is
    // then thrown away.
    //
    // Only past user/assistant turns come back — no tool calls, no tool results, no stored
    // system prompt. Replayed tool output would be a snapshot of the data as it was when it
    // was fetched, and the model would answer from it instead of re-reading the database.
    const history = dto.conversationId
      ? await this.threads.history(dto.conversationId, request.userId)
      : [];

    // Started before the grounding fetch would be tidier, but the honest clock for "how long
    // did the user wait for their answer" starts when the model work does.
    const startedAt = Date.now();
    // The facts that identify the run regardless of how it ends. Provider and model are read
    // from the config NOW and stored on the row, because AgentSetting is a single mutable row:
    // resolving them later would re-attribute every past run to today's model.
    const who = {
      question: named ? named.who.question : dto.question,
      surface: dto.surface,
      userId: request.userId,
      userEmail: request.userEmail,
      provider: cfg.provider,
      modelName: named ? named.who.modelName : cfg.model,
      startedAt,
      ...(named ? { agentId: named.who.agentId, definitionSnapshot: named.who.definitionSnapshot } : {}),
    };

    // The generic assistant's web search is the app-wide switch on the AI Provider page, honoured
    // only where the provider has a native search. Unlike a named agent, which is REFUSED on a
    // provider without search (its designer asked for it by name), the assistant just answers
    // from the app's data and says so: a person asking a question should not be turned away by
    // an admin's provider choice. Named agents keep their own flag and never read this one.
    const assistantWantsSearch = !named && cfg.assistantWebSearch === true;
    const assistantWebSearch = assistantWantsSearch && webSearchSupport(cfg) !== null;
    const webSearchNote =
      assistantWantsSearch && !assistantWebSearch
        ? `Web search is switched on but the "${cfg.provider}" provider has no native search, so this answer used only this app's data.`
        : undefined;

    let result;
    try {
      result = named
        ? await runAgent(named.cfg, { ...named.options, history, onProgress })
        : await runAgent(cfg, {
            question: dto.question,
            systemPrompt: dto.systemPrompt,
            history,
            webSearch: assistantWebSearch,
            tools: buildAgentTools({
              prisma: this.prisma,
              redaction: this.grounding.getRedactionPolicy(),
            }),
            context: {
              userId: request.userId,
              userEmail: request.userEmail,
              organizationId: getTenantContext()?.organizationId,
              isPlatformAdmin: request.isPlatformAdmin,
              permissions: request.userPermissions,
              grounding,
            },
            onProgress,
          });
    } catch (err) {
      // A failed run is recorded and then rethrown. Failures are the runs that cost the most
      // to diagnose and the ones a user actually complains about, so dropping them would
      // leave the table showing only the questions that went well.
      await this.runs.record({ ...who, error: (err as Error).message });
      throw err;
    }

    // Awaited, not fire-and-forget. The store swallows its own errors, so awaiting costs one
    // short insert and buys a guarantee the row exists before the answer is read — which is
    // what makes it safe for a test, or a later screen, to look the run up immediately.
    const runId = await this.runs.record({
      ...who,
      answer: result.answer,
      iterations: result.iterations,
      stoppedEarly: result.stoppedEarly,
      usage: result.usage,
      invocations: result.invocations,
    });

    // A NEW thread is created only now, once there is an answer to put in it. Creating it up
    // front would leave an empty, untitled thread in the user's list every time a run failed.
    // An EXISTING thread is not created here, only appended to — its ownership was already
    // checked above.
    const conversationId =
      dto.conversationId ??
      (
        await this.threads.start({
          question: dto.question,
          surface: dto.surface,
          userId: request.userId,
          userEmail: request.userEmail,
        })
      ).id;

    // The one line shown under the answer, folded from what the TOOLS reported reading — never
    // from the answer text. Computed once, here, so the live response and the stored turn can
    // never disagree about what the answer was based on.
    const sources = summariseSources(result.invocations.flatMap((i) => i.sources ?? []));

    // Written only once an answer exists. A thread holding a question with no answer would
    // replay a dangling user turn on the next question, and the model would try to answer it
    // a second time.
    await this.threads.appendTurn(conversationId, {
      question: dto.question,
      answer: result.answer,
      runId,
      // Stored, not re-derived on read: the run's steps are kept, but rebuilding this from them
      // would mean a second query on every thread open and would break the moment a tool's
      // source shape changed. It is a short display string; keeping it is cheaper than earning
      // it twice.
      sources,
    });

    // `messages` is deliberately not returned: it is the raw transcript including the system
    // prompt, it is large, and no caller needs it yet. `invocations` IS returned, because when
    // an answer looks wrong the only useful question is which tools ran and what they said.
    // For a named agent with an output schema, the parsed value comes back beside the prose so a
    // page can render fields rather than regex the answer. Parsing failures are the agent's own
    // AgentOutputInvalid, surfaced as a 400 with the reason.
    let structured: unknown = undefined;
    if (namedAgent?.outputSchema) {
      try {
        structured = parseAgentOutput(result.answer, namedAgent.outputSchema, namedAgent.name);
      } catch (err) {
        throw AgentController.toHttp(err);
      }
    }

    return {
      ...(namedAgent ? { agent: { id: namedAgent.id, name: namedAgent.name }, result: structured } : {}),
      conversationId,
      runId,
      answer: result.answer,
      sources,
      invocations: result.invocations,
      iterations: result.iterations,
      stoppedEarly: result.stoppedEarly,
      usage: result.usage,
      /** Whether the provider's web search was available to THIS answer. */
      webSearch: named ? named.options.webSearch === true : assistantWebSearch,
      ...(webSearchNote ? { webSearchNote } : {}),
    };
  }

  /**
   * The caller's own threads, most recently used first.
   *
   * Every route below is scoped to `request.userId` inside the store, and that filter is NOT
   * relaxed for administrators. Tenant scoping separates organizations, not the people inside
   * one, so it would let a colleague — and certainly an admin — read someone's private
   * questions. Administering an app is not a reason to read what its users asked.
   */
  @Get('conversations')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List your own assistant threads' })
  async listConversations(@Req() request: AuthenticatedRequest) {
    this.assertAssistant(request);
    return this.threads.list(request.userId);
  }

  /** One thread with its turns, oldest first. 404 when it is not yours — deliberately the
   *  same response as "does not exist", so ids cannot be probed for other people's threads. */
  @Get('conversations/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Read one of your assistant threads' })
  async getConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.assertAssistant(request);
    return this.threads.get(id, request.userId);
  }

  /** Renames one of your own threads (404 when it is not yours, as for reading it). */
  @Patch('conversations/:id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Rename one of your assistant threads' })
  async renameConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: RenameConversationDto) {
    this.assertAssistant(request);
    return this.threads.rename(id, request.userId, dto.title);
  }

  /** Forgets a thread. The AgentRun rows behind it survive on purpose: they are the audit
   *  trail and the token bill, and those must not be erasable by tidying up a chat list. */
  @Delete('conversations/:id')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete one of your assistant threads' })
  async deleteConversation(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    await this.threads.remove(id, request.userId);
  }
}
