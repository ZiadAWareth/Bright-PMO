
import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import {
  AttemptLimiter,
  NO_SIGN_UP_MESSAGE,
  SIGN_UP_CREATED_MESSAGE,
  validateRegistration,
  type SignUpSettings,
} from './registration';
// The one judgement of "can this role administer the app", shared with the Create User Account
// step, so sign-up and a workflow can never disagree about which roles a stranger may be given.
import { roleIsAdministrator } from 'src/workflow/pulses/catalog/data/create-user/create-user.executor';
// The app's one mail sender. Auth does not own a transport of its own: an invite and a sign-in code
// go out through exactly the same settings a workflow's send-email step uses.
import { MailService } from 'src/mail/mail.service';
import { AuthSettingsService } from './auth-settings.service';
import { offersOtp, offersPassword } from './auth-methods';
import {
  PASSWORD_RESET_TTL_MS,
  PASSWORD_RESET_UNAVAILABLE_MESSAGE,
  RESET_RATE_WINDOW_MS,
  RESET_REQUESTED_MESSAGE,
  RESET_REQUEST_MAX_PER_EMAIL,
  RESET_REQUEST_MAX_PER_IP,
  createSetupToken,
  hashSetupToken,
  issueInvite,
  passwordChangedEmail,
  passwordResetEmail,
  publicBaseUrl,
  setupLink,
  setupTokenState,
  tokenMessages,
  validateChosenPassword,
} from './invites';
import { loadRevocations, revokeSessionsBefore } from './session-revocations';
import {
  CODE_REQUESTED_MESSAGE,
  CODE_REQUEST_MAX_PER_EMAIL,
  CODE_REQUEST_MAX_PER_IP,
  CODE_VERIFY_MAX_PER_IP,
  CODE_RATE_WINDOW_MS,
  LOGIN_CODE_MESSAGES,
  LOGIN_CODE_TTL_MS,
  MAX_CODE_ATTEMPTS,
  WRONG_CODE_MESSAGE,
  codeHashesMatch,
  generateLoginCode,
  hashLoginCode,
  isWellFormedCode,
  loginCodeEmail,
  loginCodeState,
  normaliseCodeEmail,
  normaliseSubmittedCode,
} from './login-codes';
import { runWithTenant } from 'src/organization-scope/tenant-context';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { AuthLogic } from '../shared/auth-logic';
import { PrismaRepository } from '../shared/repository';

/** The name fields of this app's User model a person may change about themselves. */
const PROFILE_FIELDS: readonly string[] = ["firstName","lastName"];
const PROFILE_FIELD_MAX = 80;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly authLogic: AuthLogic;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mail: MailService,
    private readonly authSettings: AuthSettingsService,
  ) {
    const userRepo = new PrismaRepository(this.prisma.user);
    this.authLogic = new AuthLogic(userRepo, {
      comparePassword: (password, hash) => bcrypt.compare(password, hash),
      hashPassword: (password) => bcrypt.hash(password, 10),
      // G18: was a hardcoded 30 days. A long-lived bearer token with no way to
      // revoke or renew it is the root of the defect; the refresh endpoint below
      // lets the frontend roll a shorter session forward instead.
      // The cast is needed because jsonwebtoken types expiresIn as a template
      // literal (`${number}d` etc.) which an env string cannot satisfy.
      signToken: (payload) =>
        this.jwtService.sign(payload, {
          expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any,
        }),
    });
  }

  /**
   * Restore "signed out everywhere" across a restart: the revocation table into the guard's memory.
   * Guarded, like every optional table here: an app generated before this feature has no such table,
   * and that only means nobody has been signed out yet.
   */
  async onModuleInit() {
    try {
      const rows = await (this.prisma as any).authSessionRevocation?.findMany?.();
      if (Array.isArray(rows)) loadRevocations(rows);
    } catch (err) {
      this.logger.warn('Session revocations could not be loaded: ' + (err as Error).message);
    }
  }

  /**
   * Sign in with a password.
   *
   * TWO REFUSALS THAT ARE NOT "WRONG PASSWORD", both deliberate:
   *   - an app configured for one-time codes only does not accept a password at all, and says so
   *     rather than failing the comparison of a password it was never going to check
   *   - an account that has never set a password (an invited person who has not followed their
   *     link) is told exactly that. It is the whole reason the message exists: otherwise the person
   *     tries passwords that cannot work and the administrator resets one that does not exist.
   * Neither reveals anything an attacker cannot already learn: contract.auth.methods publishes the
   * first, and the login route already distinguishes "user not found" from "invalid password".
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const methods = await this.authSettings.methods();
    if (!offersPassword(methods)) {
      throw new ForbiddenException(
        'This app signs people in with a one-time code sent by email. Ask for a code instead.',
      );
    }
    try {
      return await this.authLogic.login(email, password);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Public self-registration. Per IP, in this process only — see the note in
   * registration.ts: it is a floor against a script hammering one box, not a
   * guarantee, and it counts nothing once the app runs on several instances.
   */
  private readonly registerLimiter = new AttemptLimiter();

  /**
   * Public sign-up: create the account, with the role and organisation an administrator chose.
   *
   * OFF UNLESS SWITCHED ON in Settings → Sign-in & Email. With it off the answer is a 403 saying
   * this app does not offer self-registration, and the app contract publishes the same fact.
   *
   * WHAT THE CALLER CANNOT DECIDE: the role and the organisation. RegisterDto declares four
   * properties and ValidationPipe refuses anything else, and validateRegistration refuses unknown
   * keys a second time — so roleId, organizationId and isPlatformAdmin are refused here.
   *
   * The role is checked on EVERY sign-up, not only when it was chosen: it may have been deleted,
   * or widened on the roles page into one that can administer the app since.
   *
   * NO TOKENS COME BACK. The person signs in through /auth/login like anybody else.
   */
  async register(registerDto: RegisterDto, clientIp: string) {
    if (!this.registerLimiter.take(clientIp)) {
      const retryAfter = this.registerLimiter.retryAfterSeconds(clientIp);
      throw new HttpException(
        'Too many sign-up attempts from this address. Try again in ' +
          Math.ceil(retryAfter / 60) +
          ' minute(s).',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const signUp = await this.authSettings.signUp();
    if (!signUp.enabled || !signUp.role) {
      // 403, not 404: the route exists on every app of this generator version, and a builder
      // reading the app contract already knows this app has sign-up switched off.
      throw new ForbiddenException(NO_SIGN_UP_MESSAGE);
    }

    const checked = validateRegistration(registerDto);
    if (!checked.ok) {
      throw new BadRequestException(checked.message);
    }
    const { email, password, firstName, lastName } = checked.value;

    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      // Plainly stated rather than disguised. See the comment on validateRegistration: the login
      // route already distinguishes "user not found" from "wrong password", so a vague message
      // here would hide nothing and would make a genuine typo impossible to act on.
      throw new BadRequestException('An account with that email already exists.');
    }

    // Under the organisation the setting names, never the request's: nobody is signed in here, so
    // there is no request tenant to trust.
    await runWithTenant({ organizationId: signUp.organizationId ?? undefined }, async () => {
      const role = await this.signUpRole(signUp);
      const data: Record<string, unknown> = {
        email,
        // Hashed with the helper the login path uses. The plaintext is never stored anywhere.
        password: await this.authLogic.hashPassword(password),
        roleId: role.id,
      };
      if (firstName && PROFILE_FIELDS.includes('firstName')) data.firstName = firstName;
      if (lastName && PROFILE_FIELDS.includes('lastName')) data.lastName = lastName;
      if (signUp.organizationId) data.organizationId = signUp.organizationId;
      await this.prisma.user.create({ data: data as any });
    });

    return { status: 'created', accountCreated: true, message: SIGN_UP_CREATED_MESSAGE };
  }

  /**
   * The role sign-up hands out, checked now. A role that no longer exists, or that has since been
   * given the right to administer the app, stops sign-up with a message the administrator can act
   * on — it is never handed to a stranger.
   */
  private async signUpRole(signUp: SignUpSettings): Promise<{ id: number }> {
    const name = String(signUp.role ?? '').trim();
    const role = name
      ? await (this.prisma as any).rolesAndPermissions.findFirst({ where: { role: name } })
      : null;
    if (!role) {
      this.logger.warn('Sign-up is on, but its role "' + name + '" no longer exists.');
      throw new ForbiddenException('Sign-up is not available right now. Please contact an administrator.');
    }
    if (roleIsAdministrator(role)) {
      this.logger.warn('Sign-up refused: its role "' + name + '" can now administer the app.');
      throw new ForbiddenException('Sign-up is not available right now. Please contact an administrator.');
    }
    return role;
  }

  // ── Invitations: an account exists, with no password, until its owner chooses one ───────────

  /** Where the emailed link points — the BROWSER origin, not the API's. See publicBaseUrl. */
  private get appBaseUrl(): string {
    return publicBaseUrl(process.env);
  }

  private get appName(): string {
    return process.env.APP_NAME || 'This app';
  }

  /**
   * Invite somebody, or invite them again.
   *
   * ISSUING AN INVITE KILLS EVERY EARLIER ONE for that account. Without that, "re-send" would leave
   * two working links in two different mailboxes, and revoking a mis-sent invite would be
   * impossible. Deleting rather than marking them spent, because an unspent link that was superseded
   * is not history worth keeping — the one that matters is the newest.
   *
   * The token row is written BEFORE the email is sent and removed again if the send fails, so the
   * app never ends up holding a live link nobody received. Mail failure is reported to the
   * administrator: a silent success here is how somebody waits three days for an invitation that was
   * never sent.
   */
  async sendInvite(userId: number, actorEmail?: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: Number(userId) },
      select: { id: true, email: true },
    });
    if (!user) throw new BadRequestException('No such account.');

    try {
      // The SAME helper the workflow engine's invite mode uses, with the store and the sender passed
      // in. One implementation of "kill the old links, write the new one, send it, and undo the row
      // if the send fails" — see issueInvite in invites.ts.
      const result = await issueInvite({
        userId: Number(user.id),
        email: String((user as any).email ?? ''),
        appName: this.appName,
        baseUrl: this.appBaseUrl,
        tokens: (this.prisma as any).authSetupToken,
        mail: this.mail,
      });
      return {
        sent: true,
        email: String((user as any).email ?? '').trim().toLowerCase(),
        expiresAt: result.expiresAt,
        // Never the token. The link exists in exactly one place: the mailbox it was sent to.
        invitedBy: actorEmail ?? null,
      };
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  /**
   * Who cannot sign in yet.
   *
   * Derived from the CREDENTIAL (password IS NULL), not from a flag beside it: a flag can disagree
   * with the password column, and the question the Users page asks is precisely "can this person
   * sign in". The newest outstanding token is joined on so the page can say whether their link is
   * still live or has expired.
   */
  async pendingInvites() {
    const users = await this.prisma.user.findMany({
      where: { password: null },
      select: { id: true, email: true },
    });
    if (!users.length) return { pending: [] };
    const tokens = await (this.prisma as any).authSetupToken.findMany({
      where: { userId: { in: users.map((u: any) => Number(u.id)) }, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const newestByUser = new Map<number, any>();
    for (const token of tokens) {
      if (!newestByUser.has(Number(token.userId))) newestByUser.set(Number(token.userId), token);
    }
    return {
      pending: users.map((user: any) => {
        const token = newestByUser.get(Number(user.id));
        const state = token ? setupTokenState(token) : 'unknown';
        return {
          id: Number(user.id),
          email: user.email,
          // 'valid' = a live link is out there; 'expired' = they need a new one; 'unknown' = never
          // invited, which is the state of an account created before this feature existed.
          invite: state,
          invitedAt: token?.createdAt ? new Date(token.createdAt).toISOString() : null,
          expiresAt: token?.expiresAt ? new Date(token.expiresAt).toISOString() : null,
        };
      }),
    };
  }

  /**
   * Is this link still good? PUBLIC, and answers before anything is submitted, so the screen can say
   * "this link has expired" instead of taking a person through a password form that fails on submit.
   *
   * Returns 200 with a state rather than a 404: the state IS the answer, and a screen that has to
   * catch an exception to render its own copy is a screen that renders a stack trace the first time
   * somebody changes the exception filter.
   */
  async checkSetupToken(token: string) {
    const hash = hashSetupToken(String(token ?? ''));
    const row = hash
      ? await (this.prisma as any).authSetupToken.findUnique({ where: { tokenHash: hash } })
      : null;
    const state = setupTokenState(row);
    return {
      valid: state === 'valid',
      state,
      // 'invite' or 'reset': the screen titles itself from this ("Set up your account" or "Choose a
      // new password"). Reported for a dead link too, so its message can say where to get a new one.
      purpose: row?.purpose === 'reset' ? 'reset' : 'invite',
      message: tokenMessages(row?.purpose)[state],
      // The address, only for a link that is actually good, so the form can show whose account this
      // is. A dead link tells an anonymous caller nothing.
      email: state === 'valid' ? row?.email ?? null : null,
    };
  }

  /**
   * Set the password an invited person chose. PUBLIC — the token IS the authentication.
   *
   * SINGLE USE is enforced by the database, not by a read-then-write: the token is spent with an
   * updateMany that requires usedAt to still be NULL, and a count of zero means somebody else
   * already spent it. A findUnique followed by an update would let two simultaneous submissions both
   * succeed.
   */
  async setupPassword(token: string, password: string) {
    const checked = validateChosenPassword(password);
    if (!checked.ok) throw new BadRequestException(checked.message);

    const hash = hashSetupToken(String(token ?? ''));
    const row = hash
      ? await (this.prisma as any).authSetupToken.findUnique({ where: { tokenHash: hash } })
      : null;
    const messages = tokenMessages(row?.purpose);
    const state = setupTokenState(row);
    if (state !== 'valid') throw new BadRequestException(messages[state]);

    const spent = await (this.prisma as any).authSetupToken.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (spent.count === 0) throw new BadRequestException(messages.used);

    const passwordHash = await this.authLogic.hashPassword(checked.value);
    const userId = Number(row.userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });
    // Any OTHER link still out for this account dies with the old password: a second reset email in
    // the same mailbox must not still work afterwards.
    await (this.prisma as any).authSetupToken.deleteMany({ where: { userId, usedAt: null } });

    if (row.purpose === 'reset') {
      // A reset is how an account is taken over, so it ends every existing session (a stolen one
      // included) and tells the owner. Both are best effort AFTER the password is changed: the
      // person must not be left with a half-applied reset because a mail server was down.
      await this.revokeSessions(userId);
      // "Secure my account" goes to the forgot-password page: resetting again is the way out.
      const letter = passwordChangedEmail({ appName: this.appName, resetUrl: this.appBaseUrl + '/forgot-password' });
      try {
        await this.mail.send({ to: row.email, subject: letter.subject, html: letter.html, text: letter.text });
      } catch (err) {
        this.logger.warn('The password-changed notice could not be sent: ' + (err as Error).message);
      }
      return { ok: true, email: row.email, message: 'Your password has been changed. Sign in with your new password.' };
    }

    // No tokens here on purpose, exactly as with sign-up: the person now has a password and signs in
    // through /auth/login like anybody else, which also proves the password they just chose works.
    return { ok: true, email: row.email, message: 'Your password is set. You can sign in now.' };
  }

  /** End every session this person had: written to the table, and to the guard's memory. */
  private async revokeSessions(userId: number) {
    const at = new Date();
    revokeSessionsBefore(userId, at);
    try {
      await (this.prisma as any).authSessionRevocation.upsert({
        where: { userId },
        create: { userId, revokedBefore: at },
        update: { revokedBefore: at },
      });
    } catch (err) {
      // Still revoked in this process; only a restart before the next reset would forget it.
      this.logger.warn('Session revocation was not persisted: ' + (err as Error).message);
    }
  }

  // ── Forgot password ─────────────────────────────────────────────────────────────────────────
  //
  // ALWAYS ON, like any product's — but it can only work when the app can send email, so it is
  // AVAILABLE exactly when password sign-in is offered AND email delivery is configured. Nothing to
  // switch on: an administrator who sets up email gets it, and one who has not set it up is told why
  // on the Sign-in and email page. The sign-in screen shows the link only while it is available, so
  // nobody is ever offered a reset that cannot arrive.

  private readonly resetEmailLimiter = new AttemptLimiter({
    maxAttempts: RESET_REQUEST_MAX_PER_EMAIL,
    windowMs: RESET_RATE_WINDOW_MS,
  });
  private readonly resetIpLimiter = new AttemptLimiter({
    maxAttempts: RESET_REQUEST_MAX_PER_IP,
    windowMs: RESET_RATE_WINDOW_MS,
  });

  /** Can a person reset their own password right now? Read live: email settings change at runtime. */
  async passwordResetAvailable(): Promise<boolean> {
    const methods = await this.authSettings.methods();
    if (!offersPassword(methods)) return false;
    try {
      return Boolean((await this.mail.describe()).configured);
    } catch {
      return false;
    }
  }

  /**
   * "Forgot password?" — email a reset link. PUBLIC.
   *
   * THE SAME ANSWER FOR EVERY ADDRESS, exactly like the sign-in code route: same status, same
   * sentence, mail failures logged and never surfaced. Refused outright (403) only when NO address
   * could get a link — codes-only sign-in, or no email delivery — which reveals nothing about anyone.
   */
  async requestPasswordReset(rawEmail: unknown, clientIp: string) {
    const methods = await this.authSettings.methods();
    if (!offersPassword(methods)) {
      throw new ForbiddenException('This app signs people in with a one-time code, so there is no password to reset.');
    }
    if (!(await this.passwordResetAvailable())) throw new ForbiddenException(PASSWORD_RESET_UNAVAILABLE_MESSAGE);

    const email = normaliseCodeEmail(rawEmail);
    if (!this.resetIpLimiter.take(clientIp)) this.tooMany(this.resetIpLimiter.retryAfterSeconds(clientIp));
    if (email && !this.resetEmailLimiter.take(email)) this.tooMany(this.resetEmailLimiter.retryAfterSeconds(email));

    const user = email
      ? await this.prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, email: true },
        })
      : null;

    if (user) {
      const userId = Number(user.id);
      const to = String((user as any).email ?? email).trim().toLowerCase();
      const issue = createSetupToken(new Date(), PASSWORD_RESET_TTL_MS);
      // One live link per account: a new request cancels the previous one (and any invitation).
      await (this.prisma as any).authSetupToken.deleteMany({ where: { userId, usedAt: null } });
      const row = await (this.prisma as any).authSetupToken.create({
        data: { userId, email: to, tokenHash: issue.tokenHash, purpose: 'reset', expiresAt: issue.expiresAt },
      });
      const letter = passwordResetEmail({ appName: this.appName, link: setupLink(this.appBaseUrl, issue.token) });
      try {
        const sent = await this.mail.send({ to, subject: letter.subject, html: letter.html, text: letter.text });
        if (!sent.sent) throw new Error(sent.via);
      } catch (err) {
        // Not surfaced (see above), but the dead link is removed so the person's next request is the
        // only live one, and the administrator can find the failure in the log.
        await (this.prisma as any).authSetupToken.delete({ where: { id: row.id } }).catch(() => undefined);
        this.logger.warn('A password reset email could not be sent: ' + (err as Error).message);
      }
    }

    return { requested: true, message: RESET_REQUESTED_MESSAGE };
  }

  // ── One-time codes ──────────────────────────────────────────────────────────────────────────
  //
  // Both limiters are the SAME in-process AttemptLimiter the registration route uses, with the same
  // caveat: per instance, forgotten on restart. A floor against a script hammering one box, not a
  // guarantee across replicas.

  private readonly codeEmailLimiter = new AttemptLimiter({
    maxAttempts: CODE_REQUEST_MAX_PER_EMAIL,
    windowMs: CODE_RATE_WINDOW_MS,
  });
  private readonly codeIpLimiter = new AttemptLimiter({
    maxAttempts: CODE_REQUEST_MAX_PER_IP,
    windowMs: CODE_RATE_WINDOW_MS,
  });
  private readonly verifyIpLimiter = new AttemptLimiter({
    maxAttempts: CODE_VERIFY_MAX_PER_IP,
    windowMs: CODE_RATE_WINDOW_MS,
  });

  private tooMany(retryAfterSeconds: number): never {
    throw new HttpException(
      'Too many attempts. Try again in ' + Math.ceil(retryAfterSeconds / 60) + ' minute(s).',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async assertOtpOffered(): Promise<void> {
    const methods = await this.authSettings.methods();
    if (!offersOtp(methods)) {
      throw new ForbiddenException('This app does not sign people in with a one-time code.');
    }
  }

  /**
   * Send a sign-in code. PUBLIC.
   *
   * THE ANSWER IS THE SAME WHETHER OR NOT THE ADDRESS HAS AN ACCOUNT — same status, same sentence,
   * and the same work done before answering. This is the one route in the app that must not become
   * an account oracle, and it is the cheapest one to probe, so the rule is absolute here even though
   * registration and login are each explicitly non-enumerable for their own argued reasons.
   *
   * A mail failure is logged, not surfaced: telling the caller that sending failed would answer
   * differently for a known address and undo the whole point.
   */
  async requestLoginCode(rawEmail: unknown, clientIp: string) {
    await this.assertOtpOffered();

    const email = normaliseCodeEmail(rawEmail);
    // Per IP first, so a script working through an address list is stopped before it has produced a
    // single email, and per email second, so one mailbox cannot be flooded from many addresses.
    if (!this.codeIpLimiter.take(clientIp)) this.tooMany(this.codeIpLimiter.retryAfterSeconds(clientIp));
    if (email && !this.codeEmailLimiter.take(email)) {
      this.tooMany(this.codeEmailLimiter.retryAfterSeconds(email));
    }

    const user = email
      ? await this.prisma.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          select: { id: true, email: true },
        })
      : null;

    if (user) {
      const code = generateLoginCode();
      // A new code invalidates every earlier one for this address, so there is never more than one
      // live code per mailbox to guess at.
      await (this.prisma as any).authLoginCode.deleteMany({ where: { email } });
      await (this.prisma as any).authLoginCode.create({
        data: {
          email,
          codeHash: hashLoginCode(email, code),
          expiresAt: new Date(Date.now() + LOGIN_CODE_TTL_MS),
        },
      });
      const letter = loginCodeEmail({ appName: this.appName, code });
      try {
        await this.mail.send({
          to: email,
          subject: letter.subject,
          html: letter.html,
          text: letter.text,
        });
      } catch {
        // Swallowed on purpose — see above. The row stays, so a retry re-sends rather than locking
        // the person out of a code they may yet receive.
      }
    }

    return { requested: true, message: CODE_REQUESTED_MESSAGE };
  }

  /**
   * Exchange a code for the tokens login returns. PUBLIC.
   *
   * Returns EXACTLY what /auth/login returns, from the same helper, so a sign-in screen has one
   * success path to handle whichever method the app offers.
   */
  async verifyLoginCode(rawEmail: unknown, rawCode: unknown, clientIp: string) {
    await this.assertOtpOffered();
    if (!this.verifyIpLimiter.take(clientIp)) this.tooMany(this.verifyIpLimiter.retryAfterSeconds(clientIp));

    const email = normaliseCodeEmail(rawEmail);
    const code = normaliseSubmittedCode(rawCode);
    // A malformed code is refused with the same sentence a wrong one gets: "six digits or nothing"
    // is not information worth giving away, and it cannot match a stored digest anyway.
    if (!email || !isWellFormedCode(code)) throw new BadRequestException(WRONG_CODE_MESSAGE);

    const row = await (this.prisma as any).authLoginCode.findFirst({
      where: { email },
      orderBy: { createdAt: 'desc' },
    });
    const state = loginCodeState(row);
    if (state !== 'valid') throw new BadRequestException(LOGIN_CODE_MESSAGES[state]);

    if (!codeHashesMatch(row.codeHash, hashLoginCode(email, code))) {
      // The counter is what makes six digits safe, so it moves on every wrong guess — before the
      // answer goes back, so a caller that disconnects mid-request still pays for the attempt.
      const attempts = Number(row.attempts ?? 0) + 1;
      await (this.prisma as any).authLoginCode.update({
        where: { id: row.id },
        data: { attempts },
      });
      throw new BadRequestException(
        attempts >= MAX_CODE_ATTEMPTS ? LOGIN_CODE_MESSAGES.locked : WRONG_CODE_MESSAGE,
      );
    }

    // Spent in the database, with usedAt still NULL as the condition, so two submissions of the same
    // correct code cannot both mint a session.
    const spent = await (this.prisma as any).authLoginCode.updateMany({
      where: { id: row.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (spent.count === 0) throw new BadRequestException(LOGIN_CODE_MESSAGES.used);

    try {
      // refresh() re-reads the user and their role and signs the same payload login does. It does not
      // look at the password column, which is what lets an invited person who never set a password
      // sign in with a code.
      return await this.authLogic.refresh(email);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
  }

  // ── Your own profile ────────────────────────────────────────────────────────────────────────
  //
  // Every route below acts on the SIGNED-IN person only, identified by their token — never by an id
  // in the request, so nobody can read or change somebody else's profile through them.

  /** Wrong current passwords per person, so the change-password form cannot be used to guess one. */
  private readonly passwordChangeLimiter = new AttemptLimiter({ maxAttempts: 5, windowMs: 15 * 60 * 1000 });

  private async currentUser(email: string): Promise<any> {
    if (!email) throw new BadRequestException('Cannot read your profile: no authenticated identity on the request.');
    try {
      return await this.authLogic.findUserByEmail(email);
    } catch {
      throw new BadRequestException('Your account could not be found. Sign in again.');
    }
  }

  /** What the Profile page shows. Never the password hash: only whether there is one. */
  private async profileView(user: any) {
    const claims = this.authLogic.payloadFor(user);
    const methods = await this.authSettings.methods();
    return {
      id: Number(user.id),
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      roleName: claims.roleName ?? null,
      organizationId: claims.organizationId ?? null,
      isPlatformAdmin: Boolean(claims.isPlatformAdmin),
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
      hasPassword: Boolean(user.password),
      // Whether this app signs people in with a password at all (codes-only apps have none to change).
      passwordSignIn: offersPassword(methods),
      editableFields: PROFILE_FIELDS,
    };
  }

  async profile(email: string) {
    return this.profileView(await this.currentUser(email));
  }

  /**
   * Change your own name. ONLY the name fields this app's model has; anything else in the body —
   * email, role, organisation — is refused rather than ignored, so a crafted request learns nothing.
   * Returns a fresh token too: the name travels in it, and the top bar reads it from there.
   */
  async updateProfile(email: string, body: unknown) {
    const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
    const unknownKeys = Object.keys(input).filter((key) => !PROFILE_FIELDS.includes(key));
    if (unknownKeys.length) {
      throw new BadRequestException('These details cannot be changed here: ' + unknownKeys.join(', ') + '.');
    }
    const data: Record<string, string> = {};
    for (const key of PROFILE_FIELDS) {
      if (input[key] === undefined) continue;
      const value = typeof input[key] === 'string' ? (input[key] as string).trim() : '';
      if (!value) throw new BadRequestException('Your ' + (key === 'firstName' ? 'first' : 'last') + ' name cannot be empty.');
      if (value.length > PROFILE_FIELD_MAX) {
        throw new BadRequestException('Your ' + (key === 'firstName' ? 'first' : 'last') + ' name must be at most ' + PROFILE_FIELD_MAX + ' characters.');
      }
      data[key] = value;
    }
    const user = await this.currentUser(email);
    if (Object.keys(data).length) {
      await this.prisma.user.update({ where: { id: Number(user.id) }, data: data as any });
    }
    const fresh = await this.authLogic.refresh(email);
    return { profile: await this.profileView(fresh.user), accessToken: fresh.accessToken };
  }

  /**
   * Change your own password: the CURRENT one first (a borrowed, unlocked laptop must not be enough),
   * then the same rules a reset follows — every OTHER session ends and the owner is told by email.
   * This device stays signed in with the fresh token returned.
   */
  async changePassword(email: string, body: { currentPassword?: unknown; newPassword?: unknown }) {
    const methods = await this.authSettings.methods();
    if (!offersPassword(methods)) {
      throw new ForbiddenException('This app signs people in with a one-time code, so there is no password to change.');
    }
    const user = await this.currentUser(email);
    const userId = Number(user.id);
    if (!user.password) {
      throw new BadRequestException('Your account has no password yet. Use the link in your invitation, or Forgot password on the sign-in page.');
    }
    const key = 'user:' + userId;
    if (!this.passwordChangeLimiter.take(key)) this.tooMany(this.passwordChangeLimiter.retryAfterSeconds(key));

    const current = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    if (!current || !(await this.authLogic.validatePassword(current, user.password))) {
      throw new BadRequestException('Your current password is not correct.');
    }
    const checked = validateChosenPassword(body?.newPassword);
    if (!checked.ok) throw new BadRequestException(checked.message);
    if (await this.authLogic.validatePassword(checked.value, user.password)) {
      throw new BadRequestException('Choose a password different from your current one.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await this.authLogic.hashPassword(checked.value) },
    });
    // Any reset or invitation link still out for this account dies with the old password.
    await (this.prisma as any).authSetupToken.deleteMany({ where: { userId, usedAt: null } });
    await this.revokeSessions(userId);
    const letter = passwordChangedEmail({ appName: this.appName, resetUrl: this.appBaseUrl + '/forgot-password' });
    try {
      await this.mail.send({ to: String(user.email), subject: letter.subject, html: letter.html, text: letter.text });
    } catch (err) {
      this.logger.warn('The password-changed notice could not be sent: ' + (err as Error).message);
    }
    const fresh = await this.authLogic.refresh(email);
    return { changed: true, accessToken: fresh.accessToken, message: 'Your password was changed. Every other session was signed out.' };
  }

  /** "Sign out everywhere else": ends every other session; this device continues with a fresh token. */
  async signOutOtherSessions(email: string) {
    const user = await this.currentUser(email);
    await this.revokeSessions(Number(user.id));
    const fresh = await this.authLogic.refresh(email);
    return { signedOut: true, accessToken: fresh.accessToken };
  }

  // ── The setting itself ──────────────────────────────────────────────────────────────────────

  /** PUBLIC: how this app signs people in. A sign-in screen needs it before anybody is signed in. */
  async publicMethods() {
    const methods = await this.authSettings.methods();
    // passwordReset: whether "Forgot password?" works RIGHT NOW (password sign-in + email delivery).
    return { methods, passwordReset: await this.passwordResetAvailable() };
  }

  async describeAuthSettings() {
    return this.authSettings.describe();
  }

  async saveAuthSettings(methods: readonly any[], actorEmail?: string) {
    return this.authSettings.save(methods, actorEmail);
  }

  /**
   * Turn public sign-up on or off. Turning it on is refused for a role that does not exist or that
   * can administer the app — said now, to the administrator, rather than to the first stranger.
   */
  async saveSignUpSettings(settings: SignUpSettings, actorEmail?: string) {
    if (settings.enabled) {
      await runWithTenant({ organizationId: settings.organizationId ?? undefined }, async () => {
        const role = await (this.prisma as any).rolesAndPermissions.findFirst({ where: { role: settings.role } });
        if (!role) throw new BadRequestException('No role named "' + settings.role + '" exists.');
        if (roleIsAdministrator(role)) {
          throw new BadRequestException(
            'The role "' + settings.role + '" can administer this app, so sign-up may not hand it out. Choose a role without that right.',
          );
        }
      });
      const orgs = (this.prisma as any).organization;
      if (settings.organizationId && orgs?.findUnique) {
        const org = await orgs.findUnique({ where: { id: settings.organizationId } });
        if (!org) throw new BadRequestException('That organisation does not exist.');
      }
    }
    return this.authSettings.saveSignUp(settings, actorEmail);
  }

  async hashPassword(password: string) {
    return this.authLogic.hashPassword(password);
  }

  async comparePassword(password: string, confirmPassword: string) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords Mismatch');
    }
  }

  async validatePassword(password: string, userHashedPassword: string) {
    const isValid = await this.authLogic.validatePassword(password, userHashedPassword);
    if (!isValid) {
      throw new BadRequestException('Invalid Password');
    }
  }

  async validateEmailNotExists(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (user) {
      throw new BadRequestException('Email already exists');
    }
  }

  async findUserByEmail(email: string) {
    try {
      return await this.authLogic.findUserByEmail(email);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async refreshToken(email: string) {
    if (!email) {
      throw new BadRequestException('Cannot refresh: no authenticated identity on the request');
    }
    try {
      return await this.authLogic.refresh(email);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * A 10-minute token for the UI Builder, for the person a builder key was issued to — with their
   * CURRENT role. Marked scope 'builder': AuthGuard accepts it on the app-contract route only.
   */
  async builderAccessToken(email: string): Promise<string> {
    const user = await this.authLogic.findUserByEmail(email);
    if (!user) throw new BadRequestException('The person who connected the builder no longer exists.');
    return this.jwtService.sign({ payload: { ...this.authLogic.payloadFor(user), scope: 'builder' } }, { expiresIn: '10m' });
  }

  async logout(userId: number) {
    return { message: 'Logged out successfully' };
  }
}

