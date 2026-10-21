/**
 * The invite: how a person an administrator created gets their own password.
 *
 * THE PROBLEM THIS SOLVES. An administrator used to TYPE somebody else's password into a form and
 * pass it on by hand — over chat, usually, where it stays for ever. Now the account is created with
 * NO password at all (User.password is nullable), cannot sign in, and the person receives a
 * single-use link that lets them choose one.
 *
 * STORAGE, and why it is this shape:
 *   - the token is 32 bytes from the CSPRNG, so there is nothing to guess
 *   - only its SHA-256 DIGEST is stored, so a leaked dump of AuthSetupToken is a list of digests
 *     rather than a set of working links
 *   - SHA-256 and not bcrypt because the input is already full-entropy: there is no low-entropy
 *     secret to stretch, and a digest can carry a UNIQUE index, which turns "find the row for this
 *     link" into one indexed lookup instead of a scan over every outstanding invite
 *   - a spent token is kept and marked, not deleted, so a second click can be answered with "this
 *     link has already been used" instead of the misleading "no such link"
 *
 * Everything here is plain data in, plain data out, so single use, expiry and "a new invite kills
 * the old one" are proven by calling it.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from './registration';
// The app's one email layout (src/mail/email-layout.ts), in the app's brand: every message the app
// sends has the same structure, logo and colours.
import { renderAppEmail } from '../mail/email-brand';

/** 32 bytes, base64url — 256 bits of entropy in a 43-character URL-safe string. */
export const SETUP_TOKEN_BYTES = 32;

/**
 * THREE DAYS.
 *
 * The window has to survive a weekend — an invite sent on Friday afternoon that is dead before
 * Monday morning generates a support request every single time, and the fix is always "send
 * another one", which teaches nobody anything. It must also be short enough that an old invite
 * sitting in a mailbox is not a working key months later; three days is the shortest window that
 * clears a weekend plus one working day. Re-sending is one click on the Users page, so a person who
 * misses it is never stuck.
 */
export const SETUP_TOKEN_TTL_MS = 72 * 60 * 60 * 1000;

export interface SetupTokenIssue {
  /** Goes in the emailed link and is never stored. */
  token: string;
  /** What IS stored. */
  tokenHash: string;
  expiresAt: Date;
}

/** SHA-256, hex. The only representation of a token that touches the database. */
export function hashSetupToken(token: string): string {
  return createHash('sha256').update(String(token ?? ''), 'utf8').digest('hex');
}

/** Mint a fresh link. The plaintext exists only in the returned object and in the email. */
export function createSetupToken(now: Date = new Date(), ttlMs: number = SETUP_TOKEN_TTL_MS): SetupTokenIssue {
  const token = randomBytes(SETUP_TOKEN_BYTES).toString('base64url');
  return {
    token,
    tokenHash: hashSetupToken(token),
    expiresAt: new Date(now.getTime() + ttlMs),
  };
}

// ── Forgot password ─────────────────────────────────────────────────────────────────────────
//
// The same table, hashing and single-use rule as an invitation, with purpose 'reset'. What differs
// is the lifetime and the wording: an invitation waits days for somebody who has never used the app;
// a reset is requested by the person themselves, who is at the screen right now.

/** Why a link exists. Stored on the row, so the screen and the wording follow it. */
export type SetupTokenPurpose = 'invite' | 'reset';

/**
 * Thirty minutes. Long enough to find the email and finish; short enough that a reset link left in
 * a mailbox (or a mail log, or a forwarded message) is not a working key for long. The common
 * industry window for a self-service reset.
 */
export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

/** Per email and per IP, over 15 minutes: the same shape as the sign-in code limits. */
export const RESET_REQUEST_MAX_PER_EMAIL = 5;
export const RESET_REQUEST_MAX_PER_IP = 20;
export const RESET_RATE_WINDOW_MS = 15 * 60 * 1000;

/**
 * The answer to EVERY reset request, whether or not the address has an account. Saying "no account
 * with that email" would turn the form into a way to test which addresses are customers.
 */
export const RESET_REQUESTED_MESSAGE =
  'If an account exists for that address, we have sent it a link to reset the password. The link expires in 30 minutes.';

/** Why the request is refused outright: there is no way to deliver the link. */
export const PASSWORD_RESET_UNAVAILABLE_MESSAGE =
  'Password reset is not available yet: this app cannot send email. Ask an administrator to set up email delivery.';

/** A reset link's states, in the words of someone who asked for it themselves. */
export const RESET_TOKEN_MESSAGES: Record<SetupTokenState, string> = {
  valid: 'Choose a new password for your account.',
  used: 'This link has already been used. Sign in with your new password, or ask for another link.',
  expired: 'This link has expired. Ask for a new one from the sign-in page.',
  unknown: 'This link is not valid. Ask for a new one from the sign-in page.',
};

/** The messages for a link of this purpose. An invitation's are SETUP_TOKEN_MESSAGES below. */
export function tokenMessages(purpose: string | null | undefined): Record<SetupTokenState, string> {
  return purpose === 'reset' ? RESET_TOKEN_MESSAGES : SETUP_TOKEN_MESSAGES;
}

/** The reset email: a button to the link, an amber accent (a security action), and what to do if unasked. */
export function passwordResetEmail(input: { appName: string; link: string; minutes?: number }): InviteEmail {
  const appName = String(input.appName ?? '').trim() || 'This app';
  const minutes = input.minutes ?? Math.round(PASSWORD_RESET_TTL_MS / 60000);
  const letter = renderAppEmail({
    title: appName + ' password reset',
    preheader: 'Reset the password on your ' + appName + ' account — the link expires in ' + minutes + ' minutes.',
    heading: 'Reset your password',
    accent: 'warning',
    paragraphs: ['We received a request to reset the password on your ' + appName + ' account. Choose a new one with the button below.'],
    button: { label: 'Choose a new password', url: input.link },
    note: 'The link works once and expires in ' + minutes + ' minutes.',
    panel: {
      tone: 'warning',
      title: 'Did not request this?',
      body: 'Your password has not been changed. Ignore this email and your account stays exactly as it is. If you keep receiving these, tell an administrator.',
    },
    footnote: 'Button not working? Paste this link into your browser:',
    footnoteLink: input.link,
  });
  return { subject: appName + ': reset your password', html: letter.html, text: letter.text };
}

/**
 * Sent AFTER a password is changed through a reset link. The account's owner learns of a change they
 * did not make, which is the whole value of it: a reset is how an account is taken over. The time is
 * stated in UTC so it is unambiguous, and the way out (reset again) is a button.
 */
export function passwordChangedEmail(input: { appName: string; at?: Date; resetUrl?: string }): InviteEmail {
  const appName = String(input.appName ?? '').trim() || 'This app';
  const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }).format(input.at ?? new Date()) + ' UTC';
  const letter = renderAppEmail({
    title: appName + ' password changed',
    preheader: 'Your ' + appName + ' password was changed on ' + when + '. If this was not you, act now.',
    heading: 'Your password was changed',
    statusIcon: 'success',
    paragraphs: [
      'The password on your ' + appName + ' account was changed on ' + when + '. Everyone signed in on other devices has been signed out.',
    ],
    panel: {
      tone: 'warning',
      title: 'Did not make this change?',
      body: 'Someone else may have access to your email account. Reset your password again straight away, and tell an administrator.',
    },
    button: input.resetUrl ? { label: 'Secure my account', url: input.resetUrl } : null,
    footnote: 'For your security, ' + appName + ' will never ask you for your password or a sign-in code by email, phone, or chat.',
    footer: 'This is an automated security message from ' + appName + ". Please don't reply to it.",
  });
  return { subject: appName + ': your password was changed', html: letter.html, text: letter.text };
}

/** Constant-time comparison of two hex digests, so a stored hash cannot be probed by timing. */
export function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(String(a ?? ''), 'utf8');
  const right = Buffer.from(String(b ?? ''), 'utf8');
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

/** The row as these rules read it. Whatever else the table holds is irrelevant here. */
export interface SetupTokenRow {
  tokenHash?: string | null;
  expiresAt?: Date | string | null;
  usedAt?: Date | string | null;
  purpose?: string | null;
}

export type SetupTokenState = 'valid' | 'used' | 'expired' | 'unknown';

/**
 * Is this link still good?
 *
 * The reason is reported separately from "no", because a person staring at a dead link needs to
 * know WHICH kind of dead it is: "this link has expired, ask for another" and "this link has
 * already been used, just sign in" lead to different next steps.
 */
export function setupTokenState(
  row: SetupTokenRow | null | undefined,
  now: Date = new Date(),
): SetupTokenState {
  if (!row || !row.tokenHash) return 'unknown';
  if (row.usedAt) return 'used';
  const expiresAt = row.expiresAt ? new Date(row.expiresAt) : null;
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) {
    return 'expired';
  }
  return 'valid';
}

/** What the person is told, per state. The screen shows this, so it is written for a person. */
export const SETUP_TOKEN_MESSAGES: Record<SetupTokenState, string> = {
  valid: 'Choose a password to finish setting up your account.',
  used: 'This link has already been used. Try signing in with the password you chose.',
  expired: 'This link has expired. Ask an administrator to send you a new invitation.',
  unknown: 'This link is not valid. Ask an administrator to send you a new invitation.',
};

/**
 * Why sign-in refuses an account that has never set a password.
 *
 * NOT "invalid password". A person who was invited and never followed the link would otherwise
 * spend their afternoon trying passwords that cannot possibly work, and an administrator would
 * spend it resetting a password that does not exist.
 *
 * Duplicated in src/shared/auth-logic.ts, which cannot import from here: that module is the
 * framework-agnostic logic the preview runtime loads too, and it takes no dependency on the
 * generated auth folder. Two copies of one sentence, held together by a test that reads both
 * files — the same arrangement as USER_TASK_TYPE in the app contract.
 */
export const PASSWORD_NOT_SET_MESSAGE =
  'This account has no password yet. We sent an invitation link by email — follow it to choose a password.';

/**
 * Where a person's BROWSER reaches this app — the origin an emailed link has to point at.
 *
 * CORS_ORIGIN FIRST, and that is the whole subtlety. APP_PUBLIC_URL is the origin the API answers
 * on (the deploy path rewrites it to the backend's host port, and the UI Builder reads the app
 * contract from it); a /set-password link sent there lands on the API, which has no such page.
 * CORS_ORIGIN is the origin the app's own front end is served from, which is exactly where the
 * screen lives. It is a list on some apps, so the first entry wins.
 *
 * APP_PUBLIC_URL is kept as a last resort before localhost: a wrong-host link somebody can correct
 * beats no link at all.
 */
export function publicBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const candidates = [env.APP_ADMIN_URL, env.FRONTEND_URL, env.CORS_ORIGIN, env.APP_PUBLIC_URL];
  for (const candidate of candidates) {
    const first = String(candidate ?? '').split(',')[0].trim();
    if (first && !first.includes('*')) return first.replace(/\/+$/, '');
  }
  return 'http://localhost:5173';
}

/** The link that goes in the email. The base URL is the app's own, from the environment. */
export function setupLink(baseUrl: string, token: string): string {
  const base = String(baseUrl ?? '').trim().replace(/\/+$/, '') || 'http://localhost:5173';
  return base + '/set-password?token=' + encodeURIComponent(token);
}

export interface InviteEmail {
  subject: string;
  html: string;
  text: string;
}

/** The invitation: a button to choose a password, and the reassurance that nobody else knows it. */
export function inviteEmail(input: { appName: string; link: string; hours?: number }): InviteEmail {
  const appName = String(input.appName ?? '').trim() || 'This app';
  const hours = input.hours ?? Math.round(SETUP_TOKEN_TTL_MS / 3600000);
  const letter = renderAppEmail({
    title: 'Set up your ' + appName + ' account',
    preheader: 'An account was created for you in ' + appName + '. Choose your password to start.',
    heading: 'Set up your account',
    paragraphs: ['An account has been created for you in ' + appName + '. Choose your password to start using it.'],
    button: { label: 'Choose your password', url: input.link },
    note: 'The link works once and expires in ' + hours + ' hours.',
    panel: {
      tone: 'info',
      title: 'Only you will know your password',
      body: 'Nobody at ' + appName + ', including the administrator who invited you, can see the password you choose.',
    },
    footnote: 'Button not working? Paste this link into your browser:',
    footnoteLink: input.link,
  });
  return { subject: appName + ': set up your account', html: letter.html, text: letter.text };
}

/**
 * Issue an invitation and send it.
 *
 * A PLAIN FUNCTION taking its store and its sender as parameters, not a method on a service, and
 * that is the whole point: the two callers are AuthService (the Users page's "Send invite") and the
 * workflow engine's Create User Account step in invite mode, and the second cannot import the first
 * — the pulse catalogue is app-agnostic source and the auth module is generated. One tested function
 * with its dependencies passed in beats two copies of "hash a token, kill the old ones, send the
 * mail", which is exactly the kind of pair that drifts until one of them stops expiring links.
 *
 * ORDER MATTERS, and it is deliberate:
 *   1. every earlier token for this account is deleted, so "re-send" can never leave two working
 *      links in two mailboxes and a mis-sent invite is actually revoked
 *   2. the new row is written
 *   3. the mail is sent, and if that fails the row is removed again — the app must not be left
 *      holding a live link nobody received
 */
export async function issueInvite(input: {
  userId: number | string;
  email: string;
  appName: string;
  baseUrl: string;
  tokens: SetupTokenStore;
  mail: InviteSender;
  now?: Date;
}): Promise<{ sent: boolean; via: string; expiresAt: string }> {
  const userId = Number(input.userId);
  const email = String(input.email ?? '').trim().toLowerCase();
  if (!email) throw new Error('That account has no email address to invite.');

  const issue = createSetupToken(input.now ?? new Date());
  await input.tokens.deleteMany({ where: { userId } });
  const row = await input.tokens.create({
    data: { userId, email, tokenHash: issue.tokenHash, expiresAt: issue.expiresAt },
  });

  const letter = inviteEmail({ appName: input.appName, link: setupLink(input.baseUrl, issue.token) });
  let result: { sent: boolean; via: string };
  try {
    result = await input.mail.send({
      to: email,
      subject: letter.subject,
      html: letter.html,
      text: letter.text,
    });
  } catch (err) {
    await input.tokens.delete({ where: { id: row.id } });
    throw new Error('The invitation could not be sent: ' + (err as Error).message);
  }
  if (!result.sent) {
    await input.tokens.delete({ where: { id: row.id } });
    throw new Error(
      'This app has no email settings, so the invitation could not be sent (' +
        result.via +
        '). Set them up on the Sign-in and email page first.',
    );
  }
  return { sent: true, via: result.via, expiresAt: issue.expiresAt.toISOString() };
}

/** The slice of the AuthSetupToken table issueInvite uses. Prisma's delegate satisfies it. */
export interface SetupTokenStore {
  deleteMany(args: { where: { userId: number } }): Promise<unknown>;
  create(args: {
    data: { userId: number; email: string; tokenHash: string; expiresAt: Date };
  }): Promise<{ id: string }>;
  delete(args: { where: { id: string } }): Promise<unknown>;
}

/** The slice of MailService issueInvite uses. */
export interface InviteSender {
  send(message: { to: string; subject: string; html?: string; text?: string }): Promise<{
    sent: boolean;
    via: string;
  }>;
}

export type PasswordCheck = { ok: true; value: string } | { ok: false; message: string };

/**
 * The password an invited person chose.
 *
 * The SAME floor registration enforces, imported rather than restated: two different minimum
 * lengths in one app is a bug that nobody notices until an audit.
 */
export function validateChosenPassword(value: unknown): PasswordCheck {
  const password = typeof value === 'string' ? value : '';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, message: 'Your password must be at least ' + MIN_PASSWORD_LENGTH + ' characters.' };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, message: 'Your password must be at most ' + MAX_PASSWORD_LENGTH + ' characters.' };
  }
  return { ok: true, value: password };
}
