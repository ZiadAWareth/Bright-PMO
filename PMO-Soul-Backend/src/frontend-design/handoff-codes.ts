/**
 * Single-use, short-lived codes for the builder handoff.
 *
 * IN MEMORY, DELIBERATELY. A code lives for two minutes and is used once, so persisting it would
 * add a table and a migration to store something that is worthless almost immediately. The cost is
 * stated rather than hidden: codes do not survive a restart, and with more than one replica a code
 * minted by one is unknown to another. Both fail the same safe way — the builder says "that link
 * has expired", and the admin clicks again.
 */

/** Long enough that guessing is hopeless, short enough to sit in a URL. */
const CODE_BYTES = 32;

/** Two minutes: a person clicks through immediately, or they do not. */
export const CODE_TTL_MS = 2 * 60 * 1000;

/**
 * WHO pressed the button, captured at handoff time.
 *
 * The builder signs this person in instead of asking them to log in a second time, so the
 * identity has to travel WITH the code: the redeem call is unauthenticated (the code is the
 * credential), so nothing about the caller can be re-derived there.
 */
export interface HandoffUser {
  /** The app's user id, as a string — ids are opaque to the builder. */
  id: string;
  /** Empty string when the token carried no email; the builder decides what to do. */
  email: string;
  /** A display name, falling back to the email's local part. */
  name: string;
  /** The tenant the person acted in; null for a platform operator, who has none. */
  organizationId: number | null;
  /** Tenant or platform administrator of THIS app. */
  isAdmin: boolean;
}

export interface HandoffRecord {
  userId: string;
  token: string;
  user: HandoffUser;
  expiresAt: number;
}

/**
 * Fill in what the caller left out, so a stored record is always the shape the builder is
 * promised. Missing identity must never fail the redeem: a handoff that works but signs nobody
 * in is recoverable, a handoff that 400s is not.
 */
export function normalizeHandoffUser(
  input: Partial<HandoffUser> | undefined,
  fallbackId: string,
): HandoffUser {
  const source = input || {};
  const email = String(source.email == null ? '' : source.email).trim();
  const given = String(source.name == null ? '' : source.name).trim();
  const localPart = email.includes('@') ? email.slice(0, email.indexOf('@')) : email;
  const org = source.organizationId;
  return {
    id: String(source.id == null || source.id === '' ? fallbackId || '' : source.id),
    email,
    name: given || localPart,
    organizationId: typeof org === 'number' && Number.isFinite(org) ? org : null,
    isAdmin: Boolean(source.isAdmin),
  };
}

export class HandoffCodeStore {
  private readonly codes = new Map<string, HandoffRecord>();

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly randomCode: () => string = defaultRandomCode,
  ) {}

  /**
   * Mint a code for a token AND for the identity of the person who asked. Returns the code to
   * put in the link.
   */
  issue(
    userId: string,
    token: string,
    user?: Partial<HandoffUser>,
  ): { code: string; expiresAt: number } {
    this.sweep();
    const code = this.randomCode();
    const expiresAt = this.now() + CODE_TTL_MS;
    this.codes.set(code, {
      userId,
      token,
      user: normalizeHandoffUser(user, userId),
      expiresAt,
    });
    return { code, expiresAt };
  }

  /**
   * Exchange a code for its token, once.
   *
   * The entry is deleted BEFORE the expiry check, so a late redemption also burns the code. A
   * code that survived being presented would let anyone who saw the URL try again later.
   */
  redeem(code: string): HandoffRecord | null {
    const key = String(code || '');
    const found = this.codes.get(key);
    if (!found) return null;
    this.codes.delete(key);
    if (found.expiresAt <= this.now()) return null;
    return found;
  }

  /** Drop expired codes. Called on issue, so the map cannot grow without bound. */
  sweep(): number {
    const now = this.now();
    let removed = 0;
    for (const [code, rec] of this.codes) {
      if (rec.expiresAt <= now) {
        this.codes.delete(code);
        removed += 1;
      }
    }
    return removed;
  }

  /** Test seam only. */
  get size(): number {
    return this.codes.size;
  }
}

function defaultRandomCode(): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { randomBytes } = require('crypto');
  return randomBytes(CODE_BYTES).toString('base64url');
}
