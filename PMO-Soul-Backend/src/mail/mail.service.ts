import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// The SAME encryption helper the AI provider key uses. One implementation of "a secret an admin
// typed, at rest" is one implementation to get right.
import { decryptSecret, encryptSecret } from '../agent/settings-crypto';
import {
  SMTP_CONNECT_TIMEOUT_MS,
  fromHeader,
  passwordHint,
  resolveSmtp,
  type MailMessage,
  type MailSendResult,
  type MailSettingsUpdate,
  type NodeSmtp,
  type SmtpSource,
  type StoredMailSettings,
} from './mail-settings';
import { renderAppEmail, withAppLogo } from './email-brand';

/** The single row, like AgentSetting's. A constant, not a magic string at every call site. */
const SCOPE = 'default';

/** Safe to return over HTTP. Carries no password. */
export interface MailSettingsView {
  configured: boolean;
  host: string;
  port: number | null;
  secure: boolean;
  username: string;
  fromAddress: string;
  fromName: string;
  hasPassword: boolean;
  /** Last two characters only, or ''. The password itself never leaves the server. */
  passwordHint: string;
  source: SmtpSource;
  updatedAt: string | null;
  updatedByEmail: string | null;
}

interface StoredRow {
  host: string | null;
  port: number | null;
  secure: boolean | null;
  username: string | null;
  passwordCipher: string | null;
  passwordLast4: string | null;
  fromAddress: string | null;
  fromName: string | null;
  updatedAt: Date | null;
  updatedByEmail: string | null;
}

/**
 * The one sender the whole app shares: the auth module's invites and one-time codes, and the
 * workflow's send-email step when its node names no SMTP of its own.
 *
 * Imports NOTHING from auth or workflow, so both can depend on it with no cycle.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  /** Cached until something writes through this service, exactly like AiSettingsService: a
   *  generated app runs one backend process, and that process is the only writer. */
  private cached: { settings: StoredMailSettings; row: StoredRow | null } | null = null;

  /** Logged once. A missing table would otherwise write a line per send. */
  private warnedAboutTable = false;

  constructor(private readonly prisma: PrismaService) {}

  /** Reading process.env happens HERE and in mailSettingsFromEnv only. */
  private get appSecret(): string {
    return process.env.JWT_SECRET || '';
  }

  /** What the Email page renders. No password, ever. */
  async describe(): Promise<MailSettingsView> {
    const { settings, row } = await this.load();
    const { connection, source } = resolveSmtp(null, settings, process.env);
    return {
      configured: Boolean(connection),
      host: connection?.host ?? '',
      port: connection?.port ?? null,
      secure: Boolean(connection?.secure),
      username: connection?.user ?? '',
      fromAddress: row?.fromAddress ?? '',
      fromName: row?.fromName ?? '',
      hasPassword: Boolean(row?.passwordCipher),
      passwordHint: row?.passwordLast4 ?? '',
      source,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
      updatedByEmail: row?.updatedByEmail ?? null,
    };
  }

  /**
   * Writes the settings row.
   *
   * The password follows the same three-state rule as the provider key: undefined means untouched,
   * '' means delete it, anything else is a new password. Without that rule the page would have to
   * either show the password back (which is the thing this design refuses to do) or lose it every
   * time somebody corrected a port number.
   */
  async save(update: MailSettingsUpdate, actorEmail?: string): Promise<MailSettingsView> {
    const { row } = await this.load();

    let cipher = row?.passwordCipher ?? null;
    let hint = row?.passwordLast4 ?? null;
    if (update.password !== undefined) {
      const raw = update.password.trim();
      cipher = raw ? encryptSecret(raw, this.appSecret) : null;
      hint = raw ? passwordHint(raw) : null;
    }

    const data = {
      host: update.host !== undefined ? update.host : row?.host ?? null,
      port: update.port !== undefined ? update.port : row?.port ?? null,
      secure: update.secure !== undefined ? update.secure : Boolean(row?.secure),
      username: update.username !== undefined ? update.username : row?.username ?? null,
      passwordCipher: cipher,
      passwordLast4: hint,
      fromAddress: update.fromAddress !== undefined ? update.fromAddress : row?.fromAddress ?? null,
      fromName: update.fromName !== undefined ? update.fromName : row?.fromName ?? null,
      updatedByEmail: actorEmail || null,
    };

    await (this.prisma as any).mailSetting.upsert({
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

  /**
   * Send one message.
   *
   * `nodeSmtp` is the send-email step's own connection. Passing it is how an existing workflow
   * keeps sending exactly where it always did; passing nothing is how everything else in the app
   * shares one transport.
   *
   * Returns rather than throws when there is no transport at all: an app with no mail configured
   * is a normal state (a preview, a fresh deployment), and the CALLER decides whether that is
   * fatal. The workflow step still fails the run on it — a node that reports a send that never
   * happened is the defect this shape exists to prevent.
   */
  async send(message: MailMessage, nodeSmtp?: NodeSmtp | null): Promise<MailSendResult> {
    const { settings } = await this.load();
    const { connection, source } = resolveSmtp(nodeSmtp, settings, process.env);
    if (!connection) {
      this.logger.log('[mail:not-configured] "' + message.subject + '" to ' + message.to);
      return { sent: false, via: 'no-smtp-configured', source };
    }

    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: connection.host,
      port: connection.port,
      secure: connection.secure,
      auth: connection.user ? { user: connection.user, pass: connection.pass ?? '' } : undefined,
      // Without these, a port the host blocks (DigitalOcean blocks 25/465/587) is not refused but
      // silently dropped, and nodemailer's defaults wait 2 minutes to connect and 10 on the socket:
      // the admin's "Send test" just spun. A reachable server answers well inside these.
      connectionTimeout: SMTP_CONNECT_TIMEOUT_MS,
      greetingTimeout: 10000,
      socketTimeout: 30000,
    });

    const from =
      message.from ||
      connection.from ||
      fromHeader(connection.user, process.env.APP_NAME) ||
      'no-reply@localhost';

    // The app's logo, embedded for any email laid out with it (or its name, when no image is usable).
    const branded = await withAppLogo(message);
    await transporter.sendMail({
      from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: branded.html,
      text: message.text,
      attachments: branded.attachments as any,
    });
    return { sent: true, via: 'smtp', source };
  }

  /**
   * "Send a test message" — the action that turns a form full of guesses into a fact.
   *
   * Uses the SAME send path as everything else on purpose: a test that used its own code could
   * pass while real mail failed, which is worse than having no test button.
   */
  async sendTest(to: string, actorEmail?: string): Promise<MailSendResult> {
    const appName = process.env.APP_NAME || 'This app';
    const letter = renderAppEmail({
      title: appName + ' test message',
      preheader: 'Your email settings work: invitations, sign-in codes and password resets will arrive.',
      heading: 'Your email settings work',
      statusIcon: 'success',
      greeting: null,
      paragraphs: [
        'This is a test message from ' + appName + '. If you are reading it, the mail settings saved in the admin panel work.',
        'Invitations, sign-in codes, password resets and workflow emails are all sent this same way.',
      ],
      panel: {
        tone: 'info',
        title: 'Landed in spam?',
        body: 'Mark it as not spam, and make sure the sending domain has SPF, DKIM and DMARC records — your email provider lists them.',
      },
    });
    return this.send({
      to,
      subject: appName + ': test message',
      html: letter.html,
      text: letter.text,
      ...(actorEmail ? {} : {}),
    });
  }

  /** The settings row with its password decrypted, cached. */
  private async load(): Promise<{ settings: StoredMailSettings; row: StoredRow | null }> {
    if (this.cached) return this.cached;
    const row = await this.readRow();
    const password = row ? decryptSecret(row.passwordCipher, this.appSecret) : null;
    if (row?.passwordCipher && !password) {
      // A rotated JWT_SECRET. Said out loud rather than silently sending with no credentials,
      // which most providers answer with a 535 nobody can trace back to this.
      this.logger.warn(
        'The saved SMTP password could not be decrypted — JWT_SECRET has probably changed. Re-enter it on the Email settings page.',
      );
    }
    this.cached = {
      row,
      settings: {
        host: row?.host ?? null,
        port: row?.port ?? null,
        secure: row?.secure ?? false,
        username: row?.username ?? null,
        password,
        fromAddress: row?.fromAddress ?? null,
        fromName: row?.fromName ?? null,
      },
    };
    return this.cached;
  }

  /**
   * Returns null when the table is not there — an app generated before this feature has no
   * MailSetting until it is migrated, and mail has to keep working from the environment in the
   * meantime. The same degrade-don't-crash rule AiSettingsService uses.
   */
  private async readRow(): Promise<StoredRow | null> {
    try {
      return await (this.prisma as any).mailSetting.findUnique({ where: { scope: SCOPE } });
    } catch (err) {
      if (!this.warnedAboutTable) {
        this.warnedAboutTable = true;
        this.logger.warn(
          'MailSetting is unreadable (' + (err as Error).message + '). Falling back to SMTP_* environment variables.',
        );
      }
      return null;
    }
  }
}
