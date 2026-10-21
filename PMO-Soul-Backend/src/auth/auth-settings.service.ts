import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_AUTH_METHODS,
  parseAuthMethods,
  serialiseAuthMethods,
  type AuthMethod,
} from './auth-methods';
import { DEFAULT_SIGN_UP, signUpSettingsFrom, type SignUpSettings } from './registration';

/** The single row, like AgentSetting's and MailSetting's. */
const SCOPE = 'default';

export interface AuthSettingsView {
  methods: AuthMethod[];
  /** Public sign-up: off, or on with the role and organisation a new account gets. */
  signUp: SignUpSettings;
  updatedAt: string | null;
  updatedByEmail: string | null;
}

/**
 * How people sign in to this app — the one row, cached.
 *
 * Degrades to passwords when the table cannot be read, exactly as AiSettingsService degrades to the
 * environment: an app generated before this feature has no AuthSetting until it is migrated, and a
 * front door that stops working on a missing table would be a far worse failure than a front door
 * that keeps accepting passwords.
 */
@Injectable()
export class AuthSettingsService {
  private readonly logger = new Logger(AuthSettingsService.name);

  private cached: AuthSettingsView | null = null;
  private warnedAboutTable = false;

  constructor(private readonly prisma: PrismaService) {}

  async methods(): Promise<AuthMethod[]> {
    return (await this.describe()).methods;
  }

  async describe(): Promise<AuthSettingsView> {
    if (this.cached) return this.cached;
    const row = await this.readRow();
    this.cached = {
      methods: row ? parseAuthMethods(row.methods) : [...DEFAULT_AUTH_METHODS],
      signUp: row ? signUpSettingsFrom(row) : { ...DEFAULT_SIGN_UP },
      updatedAt: row?.updatedAt ? new Date(row.updatedAt).toISOString() : null,
      updatedByEmail: row?.updatedByEmail ?? null,
    };
    return this.cached;
  }

  async save(methods: readonly AuthMethod[], actorEmail?: string): Promise<AuthSettingsView> {
    const data = { methods: serialiseAuthMethods(methods), updatedByEmail: actorEmail || null };
    await (this.prisma as any).authSetting.upsert({
      where: { scope: SCOPE },
      create: { scope: SCOPE, ...data },
      update: data,
    });
    this.invalidate();
    return this.describe();
  }

  async signUp(): Promise<SignUpSettings> {
    return (await this.describe()).signUp;
  }

  /** Public sign-up, saved apart from the methods so each form on the page saves only itself. */
  async saveSignUp(settings: SignUpSettings, actorEmail?: string): Promise<AuthSettingsView> {
    const data = {
      signUpEnabled: settings.enabled,
      signUpRole: settings.role,
      signUpOrganizationId: settings.organizationId,
      updatedByEmail: actorEmail || null,
    };
    await (this.prisma as any).authSetting.upsert({
      where: { scope: SCOPE },
      create: { scope: SCOPE, ...data },
      update: data,
    });
    this.invalidate();
    return this.describe();
  }

  invalidate(): void {
    this.cached = null;
  }

  private async readRow(): Promise<{
    methods: string | null;
    signUpEnabled?: boolean | null;
    signUpRole?: string | null;
    signUpOrganizationId?: number | null;
    updatedAt: Date | null;
    updatedByEmail: string | null;
  } | null> {
    try {
      return await (this.prisma as any).authSetting.findUnique({ where: { scope: SCOPE } });
    } catch (err) {
      if (!this.warnedAboutTable) {
        this.warnedAboutTable = true;
        this.logger.warn(
          'AuthSetting is unreadable (' + (err as Error).message + '). Signing in with a password only.',
        );
      }
      return null;
    }
  }
}
