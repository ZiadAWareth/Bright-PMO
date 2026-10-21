/**
 * The one-time sign-in code.
 *
 * An app can offer passwords, codes, or both (see auth-methods.ts). A code is six digits, emailed,
 * and good for one sign-in.
 *
 * STORAGE, and why:
 *   - only the SHA-256 digest of "email:code" is stored, so a leaked AuthLoginCode table is a list
 *     of digests and not a list of working logins, and a digest issued for one mailbox cannot be
 *     replayed against another
 *   - SHA-256 rather than bcrypt: the row carries an ATTEMPT COUNTER, and a counter is what makes a
 *     six-digit secret safe. Stretching the hash would slow every verification down to protect
 *     against an offline attack on a value that is already dead in ten minutes
 *   - the row is marked used, not deleted, so a replay is answered honestly
 *
 * THE NUMBERS, each with its reason, are constants below rather than magic values at a call site.
 */
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { renderAppEmail } from '../mail/email-brand';

/**
 * SIX digits.
 *
 * The number people can hold in their head from one window to the next, and what every service
 * that does this uses. On its own it is only a million possibilities — it is the attempt cap and the
 * ten-minute expiry, not the length, that make it safe. Eight digits would buy a hundred times more
 * guesses against an attacker who already cannot make five.
 */
export const LOGIN_CODE_DIGITS = 6;

/**
 * TEN MINUTES.
 *
 * Long enough to find the message in a mail client that polls, short enough that a code sitting in
 * an inbox is dead before anybody else reads it. Longer windows exist mainly to reduce "code
 * expired" complaints, and the cost is a live credential lying in a mailbox.
 */
export const LOGIN_CODE_TTL_MS = 10 * 60 * 1000;

/**
 * FIVE wrong guesses and the code is finished — not the account.
 *
 * Five absorbs a genuine mistyping (a transposed pair, a stale code from the previous email) and
 * still caps an online attack at five in a million per code, which is far below the noise floor of
 * any real threat. It burns the CODE rather than locking the ACCOUNT on purpose: locking accounts
 * on failed codes hands anybody who knows an address a denial-of-service against that person.
 */
export const MAX_CODE_ATTEMPTS = 5;

/**
 * Requests per email per window, and per IP per window.
 *
 * FIVE PER EMAIL: a code that does not arrive is worth asking for again a few times, and each
 * request sends a real email, so this is also a limit on being used as a mail cannon at somebody
 * else's mailbox.
 *
 * TWENTY PER IP, and deliberately higher: an office, a school or a mobile carrier puts hundreds of
 * genuine people behind one address, and a per-IP limit set as low as the per-email one would lock
 * out the fourth colleague to sign in that morning.
 *
 * Both are IN-PROCESS counters (see AttemptLimiter in registration.ts): a floor against a script
 * hammering one box, not a guarantee across replicas. Said plainly rather than implied.
 */
export const CODE_REQUEST_MAX_PER_EMAIL = 5;
export const CODE_REQUEST_MAX_PER_IP = 20;
export const CODE_VERIFY_MAX_PER_IP = 20;

/** Fifteen minutes, matching the registration limiter, so there is one window to reason about. */
export const CODE_RATE_WINDOW_MS = 15 * 60 * 1000;

/** Trim and lower-case, so the digest of an address does not depend on how it was typed. */
export function normaliseCodeEmail(value: unknown): string {
  return String(value == null ? '' : value).trim().toLowerCase();
}

/**
 * A code with no bias and no leading-zero problem: randomInt over the whole range, padded.
 *
 * Math.random would be wrong here for the obvious reason, and a "random digits" loop that drops
 * leading zeros would quietly make 000123 impossible and shrink the space.
 */
export function generateLoginCode(): string {
  const max = 10 ** LOGIN_CODE_DIGITS;
  return String(randomInt(0, max)).padStart(LOGIN_CODE_DIGITS, '0');
}

/** The digest that is stored: the code BOUND to the address it was issued for. */
export function hashLoginCode(email: string, code: string): string {
  return createHash('sha256')
    .update(normaliseCodeEmail(email) + ':' + String(code ?? '').trim(), 'utf8')
    .digest('hex');
}

/** Constant-time comparison of two hex digests. */
export function codeHashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

export interface LoginCodeRow {
  codeHash?: string | null;
  expiresAt?: Date | string | null;
  usedAt?: Date | string | null;
  attempts?: number | null;
}

export type LoginCodeState = 'valid' | 'used' | 'expired' | 'locked' | 'unknown';

/** Is this code still usable? Checked before any comparison, so a dead row is never even compared. */
export function loginCodeState(
  row: LoginCodeRow | null | undefined,
  now: Date = new Date(),
): LoginCodeState {
  if (!row || !row.codeHash) return 'unknown';
  if (row.usedAt) return 'used';
  if ((row.attempts ?? 0) >= MAX_CODE_ATTEMPTS) return 'locked';
  const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return 'expired';
  }
  return 'valid';
}

/** What the person is told. One message per state, written for a person. */
export const LOGIN_CODE_MESSAGES: Record<LoginCodeState, string> = {
  valid: 'That code is correct.',
  used: 'That code has already been used. Ask for a new one.',
  expired: 'That code has expired. Ask for a new one.',
  locked: 'Too many wrong attempts on that code. Ask for a new one.',
  unknown: 'That code is not valid. Ask for a new one.',
};

/** A wrong digit. The SAME wording as an unknown code, so neither reveals which it was. */
export const WRONG_CODE_MESSAGE = 'That code is not valid. Ask for a new one.';

/**
 * The answer to "send me a code" — identical for an address that has an account and one that does
 * not.
 *
 * This is the one place in the app where enumeration is actually prevented, so it has to be the
 * SAME sentence and the same status on both paths. Registration answers "that email is already
 * registered" and login distinguishes "user not found" from "wrong password", both argued for in
 * registration.ts; neither undoes this, because an attacker who learns an address exists still
 * cannot get a code for it. The point here is that requesting a code must not become a THIRD, and
 * cheapest, oracle.
 */
export const CODE_REQUESTED_MESSAGE =
  'If that address has an account, a sign-in code is on its way. It expires in 10 minutes.';

export interface LoginCodeEmail {
  subject: string;
  html: string;
  text: string;
}

export function loginCodeEmail(input: { appName: string; code: string; minutes?: number }): LoginCodeEmail {
  const appName = String(input.appName ?? '').trim() || 'This app';
  const minutes = input.minutes ?? Math.round(LOGIN_CODE_TTL_MS / 60000);
  const letter = renderAppEmail({
    title: appName + ' sign-in code',
    preheader: 'Your ' + appName + ' sign-in code is ' + input.code + ' — it expires in ' + minutes + ' minutes.',
    heading: 'Your sign-in code',
    paragraphs: ['Use the code below to sign in to ' + appName + '.'],
    code: input.code,
    note: 'This code expires in ' + minutes + ' minutes and works once.',
    panel: {
      tone: 'info',
      title: 'Keep this code private',
      body: appName + ' will never ask you for it. If you did not try to sign in, ignore this email — nobody can sign in without the code.',
    },
  });
  return { subject: appName + ': your sign-in code is ' + input.code, html: letter.html, text: letter.text };
}

/** A code submitted by a person: digits only, exactly the right length. */
export function normaliseSubmittedCode(value: unknown): string {
  return String(value == null ? '' : value).replace(/\D+/g, '');
}

export function isWellFormedCode(value: string): boolean {
  return new RegExp('^\\d{' + LOGIN_CODE_DIGITS + '}$').test(value);
}
