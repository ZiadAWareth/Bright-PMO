import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GroundingService, type GroundingAudience } from '../agent/grounding';
import { buildAppContract, type AppContract, type WorkflowDefinitionRow, type AgentRow } from './app-contract.build';
// The parser the auth module itself uses, so the contract cannot publish a method the front door
// would refuse. This is a plain module with no framework imports, so importing it here costs nothing.
import { parseAuthMethods } from '../auth/auth-methods';
import { signUpSettingsFrom } from '../auth/registration';

export type { AppContract } from './app-contract.build';

/**
 * Thin wrapper: fetch the two inputs, hand them to the pure builder.
 *
 * Nothing is computed here. Everything that could be wrong lives in app-contract.build.ts, which
 * has no Nest or Prisma imports and is therefore testable by calling it.
 */
@Injectable()
export class AppContractService {
  constructor(
    private readonly grounding: GroundingService,
    private readonly prisma: PrismaService,
  ) {}

  async build(audience: GroundingAudience = {}): Promise<AppContract> {
    const pack = await this.grounding.getPack(audience);
    const rows: WorkflowDefinitionRow[] = await (this.prisma as any).workflow.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        entityName: true,
        status: true,
        definition: true,
      },
    });
    // Only identity and job are selected. Instructions and ceilings never leave the app.
    // Guarded: an app generated before agents existed has no `agent` table, and a contract
    // with no agents beats no contract at all.
    let agentRows: AgentRow[] = [];
    try {
      agentRows =
        (await (this.prisma as any).agent?.findMany?.({ select: { id: true, name: true, role: true } })) ?? [];
    } catch {
      agentRows = [];
    }
    // How people sign in. Guarded like the agent rows above: an app generated before this feature
    // has no AuthSetting table, and the fallback is the same one the app's own front door uses.
    let authMethods: string[] = ['password'];
    let signUpEnabled = false;
    try {
      const setting = await (this.prisma as any).authSetting?.findUnique?.({ where: { scope: 'default' } });
      if (setting) {
        authMethods = parseAuthMethods(setting.methods);
        // The parser the register route uses: "on" only with a role to hand out.
        signUpEnabled = signUpSettingsFrom(setting).enabled;
      }
    } catch {
      authMethods = ['password'];
      signUpEnabled = false;
    }
    // Kept next to the setGlobalPrefix call it mirrors: if that changes, this must too.
    return buildAppContract(pack, rows, undefined, 'api', process.env.PROJECT_ID, agentRows, authMethods, {
      api: process.env.APP_API_URL || process.env.APP_PUBLIC_URL,
      admin: process.env.APP_ADMIN_URL,
      frontend: process.env.APP_FRONTEND_URL,
    }, signUpEnabled);
  }
}
