/**
 * Public self-registration — the rules, as plain data in and plain data out.
 *
 * SIGN-UP IS A SWITCH AN ADMINISTRATOR TURNS ON.
 * Settings → Sign-in & Email holds it: off by default, and when on, the role and the organisation a
 * new account gets. POST /api/auth/register validates the submission and creates the account with
 * exactly those — never anything the request asks for. With the switch off the app does not offer
 * self-registration at all, and says so. (It used to start a workflow with its own sign-up trigger;
 * that trigger is gone. What should happen AFTER an account exists — a welcome email, a notification —
 * is a workflow on the User table's "created" event.)
 *
 * Everything that decides whether a request is acceptable, what the switch says and what the caller
 * is told lives here, so it can be tested by calling it rather than by reading it.
 */

/**
 * The role the seed creates for sign-up to hand out, with every permission off. The sign-up
 * setting offers it first; an administrator who had to invent a role would invent one with
 * permissions.
 */
export const MEMBER_ROLE_NAME = 'Member';

/** Eight characters. Short, but it is a floor the DTO and the service both enforce. */
export const MIN_PASSWORD_LENGTH = 8;

/** Longer than this is a paste, not a password, and bcrypt ignores bytes past 72 anyway. */
export const MAX_PASSWORD_LENGTH = 128;

/** The RFC limit on an address. Anything longer is not a mailbox. */
export const MAX_EMAIL_LENGTH = 254;

/**
 * The ONLY properties a registration request may carry.
 *
 * The app runs ValidationPipe with whitelist + forbidNonWhitelisted, so an undeclared property
 * is already a 400 before the controller runs. This list is the second lock: it means a body
 * carrying roleId, organizationId or isPlatformAdmin is refused even if someone later calls the
 * service from somewhere the pipe does not cover. Privilege fields are never read from a request
 * body — the role and the organisation are decided by the server, always.
 */
export const REGISTER_FIELDS = ['email', 'password', 'firstName', 'lastName'] as const;

/** Deliberately simple: a local part, an @, a dotted domain. The mailbox proves the rest. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RegistrationInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export type RegistrationCheck =
  | { ok: true; value: RegistrationInput }
  | { ok: false; message: string };

/** Trim and lower-case, so Ada@Example.COM and ada@example.com are one account, not two. */
export function normaliseEmail(value: unknown): string {
  return String(value == null ? '' : value).trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return value.length > 0 && value.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(value);
}

/** Optional names arrive as anything; store a trimmed string or nothing. */
function normaliseName(value: unknown): string {
  return String(value == null ? '' : value).trim().slice(0, 100);
}

/**
 * Validate and normalise a registration body.
 *
 * ON THE TWO REFUSAL MESSAGES — a deliberate choice, not an oversight.
 * A malformed address gets a clear message saying so, because the person can fix it. A duplicate
 * gets its own plain message from the service ("An account with that email already exists."),
 * which does reveal that the address is registered. The alternative — one vague message for both —
 * would make a real typo unfixable, and it would buy nothing: this endpoint is public, and the
 * login route already answers "user not found" differently from "invalid password", so an address
 * can be probed there regardless. Hiding it here while leaking it there is theatre. If the owner
 * ever wants registration to be non-enumerable, BOTH routes have to change together, and the fix
 * is a "check your email" flow that always answers the same way.
 */
export function validateRegistration(body: unknown): RegistrationCheck {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'A registration needs an email address and a password.' };
  }
  const source = body as Record<string, unknown>;

  const unexpected = Object.keys(source).filter(
    (key) => !(REGISTER_FIELDS as readonly string[]).includes(key),
  );
  if (unexpected.length > 0) {
    // Named, not silently dropped: a caller sending roleId must learn it is refused, not believe
    // it was honoured.
    return { ok: false, message: 'These fields are not accepted here: ' + unexpected.sort().join(', ') };
  }

  const email = normaliseEmail(source.email);
  if (!isValidEmail(email)) {
    return { ok: false, message: 'That does not look like an email address.' };
  }

  const password = typeof source.password === 'string' ? source.password : '';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: 'Your password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.',
    };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: 'Your password must be at most ' + MAX_PASSWORD_LENGTH + ' characters.',
    };
  }

  return {
    ok: true,
    value: {
      email,
      password,
      firstName: normaliseName(source.firstName),
      lastName: normaliseName(source.lastName),
    },
  };
}

// ── The sign-up switch ─────────────────────────────────────────────────────────

/** What Settings → Sign-in & Email says about public sign-up. */
export interface SignUpSettings {
  enabled: boolean;
  /** The NAME of the role a new account gets, as the roles page shows it. */
  role: string | null;
  /** The organisation a new account joins. Null on an app without organisations. */
  organizationId: number | null;
}

/** Off, until an administrator turns it on. A table that cannot be read means off as well. */
export const DEFAULT_SIGN_UP: SignUpSettings = { enabled: false, role: null, organizationId: null };

function positiveIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The stored row as settings. Anything missing reads as off. */
export function signUpSettingsFrom(row: {
  signUpEnabled?: unknown;
  signUpRole?: unknown;
  signUpOrganizationId?: unknown;
} | null | undefined): SignUpSettings {
  if (!row) return { ...DEFAULT_SIGN_UP };
  const role = String(row.signUpRole ?? '').trim();
  return {
    // On only with a role to hand out: an account with no role is an account nobody can use.
    enabled: row.signUpEnabled === true && role.length > 0,
    role: role || null,
    organizationId: positiveIntOrNull(row.signUpOrganizationId),
  };
}

export type SignUpSettingsCheck = { ok: true; value: SignUpSettings } | { ok: false; message: string };

/**
 * Validate what the settings page sent. Turning sign-up on needs a role: that is the one question
 * the administrator must answer, because the person signing up never may.
 */
export function validateSignUpSettings(body: unknown): SignUpSettingsCheck {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, message: 'Say whether public sign-up is on.' };
  }
  const source = body as Record<string, unknown>;
  if (typeof source.enabled !== 'boolean') {
    return { ok: false, message: 'Say whether public sign-up is on.' };
  }
  const role = String(source.role ?? '').trim();
  if (source.enabled && !role) {
    return { ok: false, message: 'Choose the role new accounts get before turning sign-up on.' };
  }
  const rawOrg = source.organizationId;
  const organizationId = positiveIntOrNull(rawOrg);
  if (rawOrg !== null && rawOrg !== undefined && String(rawOrg).trim() !== '' && organizationId === null) {
    return { ok: false, message: 'That is not an organisation.' };
  }
  return { ok: true, value: { enabled: source.enabled, role: role || null, organizationId } };
}

/** What the endpoint says while sign-up is off. Not an error condition — a fact. */
export const NO_SIGN_UP_MESSAGE =
  'This app does not offer self-registration. An administrator creates accounts and sends out the credentials.';

/** What a person is told once their account exists. No token: they sign in like anybody else. */
export const SIGN_UP_CREATED_MESSAGE = 'Your account is ready. You can sign in now.';

// ── Rate limiting ────────────────────────────────────────────────────────────────────────────
//
// IN PROCESS, DELIBERATELY, AND STATED RATHER THAN HIDDEN.
// A generated app links a fixed, pre-installed dependency set, so adding a throttler package
// would break every already-deployed app that shares it. This is a Map of timestamps swept on
// use — the same shape as the handoff code store in src/frontend-design/handoff-codes.ts.
//
// The cost: the counter is PER INSTANCE. Run the app on three replicas and an attacker gets
// three times the attempts, and a restart forgets everything. It is a FLOOR, not a guarantee —
// it stops a script hammering one box, it does not stop a distributed one. A real guarantee
// needs a shared store (Redis) or a limiter at the ingress, which is an infrastructure decision,
// not a generated-code one.

/** Attempts per IP per window. Override with REGISTER_RATE_LIMIT_MAX. */
export const DEFAULT_REGISTER_MAX_ATTEMPTS = 5;

/** The window. Override with REGISTER_RATE_LIMIT_WINDOW_MS. */
export const DEFAULT_REGISTER_WINDOW_MS = 15 * 60 * 1000;

export interface LimiterSettings {
  maxAttempts: number;
  windowMs: number;
}

/** A positive whole number, or the fallback. Never trust an env string to be either. */
export function readPositiveInt(raw: unknown, fallback: number): number {
  const parsed = Number(String(raw == null ? '' : raw).trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function registerLimiterSettings(
  env: Record<string, string | undefined> = process.env,
): LimiterSettings {
  return {
    maxAttempts: readPositiveInt(env.REGISTER_RATE_LIMIT_MAX, DEFAULT_REGISTER_MAX_ATTEMPTS),
    windowMs: readPositiveInt(env.REGISTER_RATE_LIMIT_WINDOW_MS, DEFAULT_REGISTER_WINDOW_MS),
  };
}

/** A sliding window of attempt timestamps, keyed by caller. */
export class AttemptLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly settings: LimiterSettings = registerLimiterSettings(),
    private readonly now: () => number = () => Date.now(),
  ) {}

  /**
   * Record an attempt. Returns false when the caller has already used up the window.
   *
   * A refused attempt is NOT recorded, so a blocked caller cannot extend their own block for
   * ever by keeping the pressure on — the window still drains.
   */
  take(key: string): boolean {
    const bucket = String(key || 'unknown');
    this.sweep();
    const now = this.now();
    const recent = (this.hits.get(bucket) || []).filter((t) => t > now - this.settings.windowMs);
    if (recent.length >= this.settings.maxAttempts) {
      this.hits.set(bucket, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(bucket, recent);
    return true;
  }

  /** How long until this caller may try again. Zero when they may try now. */
  retryAfterSeconds(key: string): number {
    const bucket = String(key || 'unknown');
    const now = this.now();
    const recent = (this.hits.get(bucket) || []).filter((t) => t > now - this.settings.windowMs);
    if (recent.length < this.settings.maxAttempts) return 0;
    const oldest = Math.min(...recent);
    return Math.max(1, Math.ceil((oldest + this.settings.windowMs - now) / 1000));
  }

  /** Drop callers whose window has drained, so the map cannot grow without bound. */
  sweep(): number {
    const now = this.now();
    let removed = 0;
    for (const [bucket, times] of this.hits) {
      const recent = times.filter((t) => t > now - this.settings.windowMs);
      if (recent.length === 0) {
        this.hits.delete(bucket);
        removed += 1;
      } else if (recent.length !== times.length) {
        this.hits.set(bucket, recent);
      }
    }
    return removed;
  }

  /** Test seam only. */
  get size(): number {
    return this.hits.size;
  }
}

/**
 * The caller's address, for the limiter's bucket.
 *
 * req.ip FIRST, x-forwarded-for only as a fallback: Express derives req.ip from the proxy chain
 * the operator configured with "trust proxy", whereas a raw header is whatever the client typed.
 * Preferring the header would let anyone reset their own counter by changing one line of a
 * request — a limiter that anybody can opt out of is worse than none, because it looks like
 * protection.
 */
export function clientIpOf(req: {
  ip?: unknown;
  headers?: Record<string, unknown>;
  socket?: { remoteAddress?: unknown };
} | null | undefined): string {
  const direct = String((req && req.ip) || '').trim();
  if (direct) return direct;
  const forwarded = req && req.headers ? req.headers['x-forwarded-for'] : undefined;
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = String(raw == null ? '' : raw).split(',')[0].trim();
  if (first) return first;
  const socketAddress = String((req && req.socket && req.socket.remoteAddress) || '').trim();
  return socketAddress || 'unknown';
}
