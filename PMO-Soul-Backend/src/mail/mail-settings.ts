/**
 * How this app sends mail — the rules, as plain data in and plain data out.
 *
 * THE RESOLUTION ORDER, and why it is all-or-nothing:
 *   1. the SMTP a send-email node carries itself
 *   2. the settings an administrator saved on the Email page
 *   3. SMTP_* environment variables
 *   4. nothing — and then a send is reported as not sent, never as sent
 *
 * A source that wins, wins OUTRIGHT. Field-by-field merging is what the workflow runner used to
 * do, and it produced the worst possible state: a node naming its own host while the username and
 * password came from the environment — i.e. one server's credentials posted to another server.
 * Two clean sources, one of which wins, is also a thing an administrator can reason about from the
 * page in front of them.
 */

/** The port SMTP submission uses when nobody says otherwise. 465 is implicit TLS; 587 is not. */
export const DEFAULT_SMTP_PORT = 587;

/** How long to wait for an SMTP server to accept the connection before calling the port blocked. */
export const SMTP_CONNECT_TIMEOUT_MS = 15000;

/** Where a resolved connection came from. Surfaced in the UI and in the send result. */
export type SmtpSource = 'node' | 'settings' | 'environment' | 'none';

/** A usable SMTP connection. `pass` is present only in the server's memory. */
export interface SmtpConnection {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  /** The envelope sender this source implies. A node's own From still overrides it. */
  from?: string;
}

/** The SMTP a workflow node carries, as the send-email step's config spells it. */
export interface NodeSmtp {
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  user?: string | null;
  pass?: string | null;
}

/** The settings row, with the password ALREADY decrypted by the service. */
export interface StoredMailSettings {
  host?: string | null;
  port?: number | null;
  secure?: boolean | null;
  username?: string | null;
  password?: string | null;
  fromAddress?: string | null;
  fromName?: string | null;
}

function text(value: unknown): string {
  return String(value == null ? '' : value).trim();
}

/** A positive port, or the default. An env string is never trusted to be either. */
export function toPort(value: unknown, fallback: number = DEFAULT_SMTP_PORT): number {
  const parsed = Number(text(value));
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) return fallback;
  return parsed;
}

/** "Ada <ada@example.com>" from the two fields, so nobody has to know the syntax. */
export function fromHeader(address?: string | null, name?: string | null): string {
  const addr = text(address);
  if (!addr) return '';
  const display = text(name);
  if (!display) return addr;
  return display + ' <' + addr + '>';
}

/** The settings as the environment describes them. Kept here so the service reads env in one place. */
export function mailSettingsFromEnv(env: Record<string, string | undefined>): StoredMailSettings {
  return {
    host: text(env.SMTP_HOST) || null,
    port: env.SMTP_PORT ? toPort(env.SMTP_PORT) : null,
    secure: env.SMTP_SECURE === 'true',
    username: text(env.SMTP_USER) || null,
    password: text(env.SMTP_PASS) || null,
    fromAddress: text(env.SMTP_FROM) || text(env.SMTP_USER) || null,
    fromName: text(env.APP_NAME) || null,
  };
}

function connectionFrom(settings: StoredMailSettings): SmtpConnection | null {
  const host = text(settings.host);
  if (!host) return null;
  const user = text(settings.username);
  const pass = text(settings.password);
  // A From address the transport itself implies. Falls back to the username, which on nearly
  // every provider IS the mailbox, because a message with no sender is refused outright.
  const from = fromHeader(text(settings.fromAddress) || user, settings.fromName);
  return {
    host,
    port: toPort(settings.port),
    secure: Boolean(settings.secure),
    ...(user ? { user } : {}),
    ...(user && pass ? { pass } : {}),
    ...(from ? { from } : {}),
  };
}

/**
 * The connection to send this message over.
 *
 * A node that names its own host keeps using it, with its own credentials and nothing borrowed —
 * that is the promise to every workflow that already works. A node that names none takes the app's
 * settings, which is what makes "configure mail once, on one page" true.
 */
export function resolveSmtp(
  node: NodeSmtp | null | undefined,
  stored: StoredMailSettings | null | undefined,
  env: Record<string, string | undefined> = {},
): { connection: SmtpConnection | null; source: SmtpSource } {
  if (node && text(node.host)) {
    const user = text(node.user);
    const pass = text(node.pass);
    return {
      source: 'node',
      connection: {
        host: text(node.host),
        port: toPort(node.port),
        secure: Boolean(node.secure),
        ...(user ? { user } : {}),
        ...(user && pass ? { pass } : {}),
      },
    };
  }

  const fromSettings = connectionFrom(stored ?? {});
  if (fromSettings) return { connection: fromSettings, source: 'settings' };

  const fromEnv = connectionFrom(mailSettingsFromEnv(env));
  if (fromEnv) return { connection: fromEnv, source: 'environment' };

  return { connection: null, source: 'none' };
}

/** What an administrator may change. Anything else in the body is refused by name. */
export const MAIL_SETTING_FIELDS = [
  'host',
  'port',
  'secure',
  'username',
  'password',
  'fromAddress',
  'fromName',
] as const;

export interface MailSettingsUpdate {
  host?: string | null;
  port?: number | null;
  secure?: boolean;
  username?: string | null;
  /** Omitted = keep the stored password. Empty string = delete it. */
  password?: string;
  fromAddress?: string | null;
  fromName?: string | null;
}

export type MailUpdateCheck =
  | { ok: true; value: MailSettingsUpdate }
  | { ok: false; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate what the Email page sent.
 *
 * Refuses a settings row that could not possibly send — a port that is not a port, a From that is
 * not an address — while the admin is still looking at the form. A blank host is allowed: it is
 * how an administrator turns app-level mail back off.
 */
export function validateMailUpdate(body: unknown): MailUpdateCheck {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Mail settings must be an object.' };
  }
  const source = body as Record<string, unknown>;
  const unexpected = Object.keys(source).filter(
    (key) => !(MAIL_SETTING_FIELDS as readonly string[]).includes(key),
  );
  if (unexpected.length > 0) {
    return { ok: false, message: 'These fields are not accepted here: ' + unexpected.sort().join(', ') };
  }

  const value: MailSettingsUpdate = {};
  if ('host' in source) value.host = text(source.host) || null;
  if ('port' in source) {
    const raw = text(source.port);
    if (raw) {
      const port = Number(raw);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        return { ok: false, message: 'The SMTP port must be a whole number between 1 and 65535.' };
      }
      value.port = port;
    } else {
      value.port = null;
    }
  }
  if ('secure' in source) value.secure = source.secure === true || text(source.secure) === 'true';
  if ('username' in source) value.username = text(source.username) || null;
  if ('password' in source) value.password = typeof source.password === 'string' ? source.password : '';
  if ('fromAddress' in source) {
    const addr = text(source.fromAddress);
    if (addr && !EMAIL_PATTERN.test(addr)) {
      return { ok: false, message: 'The From address does not look like an email address.' };
    }
    value.fromAddress = addr || null;
  }
  if ('fromName' in source) value.fromName = text(source.fromName).slice(0, 100) || null;

  return { ok: true, value };
}

/** The only part of the password that ever leaves the server. */
export function passwordHint(value: string): string {
  return value.length >= 4 ? value.slice(-2) : '';
}

/** The message a sender is asked to deliver. Already rendered: this module does no templating. */
export interface MailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string;
  bcc?: string;
  from?: string;
  attachments?: Array<Record<string, unknown>>;
}

export interface MailSendResult {
  sent: boolean;
  /** 'smtp' when it left, or the reason it did not. Never a bare false with no explanation. */
  via: string;
  source: SmtpSource;
}
