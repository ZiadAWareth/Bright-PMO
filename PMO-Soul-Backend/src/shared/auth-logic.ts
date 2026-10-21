/**
 * AuthLogic — framework-agnostic authentication logic.
 *
 * All crypto operations are injected:
 *   Production: bcrypt + JWT
 *   Preview:    bcryptjs + base64 token
 *
 * Zero NestJS imports. Uses Repository interface for user lookups.
 */
// `import type`, not a value import: Repository is an interface, and value-importing one makes this
// module unloadable under Node's type stripping — which is how the tests load it. tsc stays green
// either way, so the value import hid the problem until something tried to run the file.
import type { Repository } from './repository';

export interface AuthDeps {
  /** Compare plaintext password against hash (bcrypt.compare or bcryptjs.compare) */
  comparePassword: (password: string, hash: string) => Promise<boolean>;
  /** Hash a plaintext password (bcrypt.hash or bcryptjs.hash) */
  hashPassword: (password: string) => Promise<string>;
  /** Sign a JWT payload (jwtService.sign or simple base64) */
  signToken: (payload: any) => string;
}

export class AuthLogic {
  constructor(
    private userRepo: Repository,
    private deps: AuthDeps,
  ) {}

  async login(email: string, password: string) {
    // Find user by email, including role relation
    const user = await this.findUserByEmail(email);

    // An invited account has NO password yet (User.password is nullable), and comparing against a
    // null hash throws from inside bcrypt with a message about arguments. Refused here, first, with
    // the sentence the person actually needs — otherwise they spend the afternoon trying passwords
    // that cannot work and an administrator resets one that does not exist.
    //
    // The wording is duplicated as PASSWORD_NOT_SET_MESSAGE in src/auth/invites.ts, which this
    // module deliberately does not import: this is the framework-agnostic logic the preview runtime
    // loads too, and it takes no dependency on the generated auth folder. A test reads both files
    // and fails if they drift.
    if (!user.password) {
      throw new Error(
        'This account has no password yet. We sent an invitation link by email — follow it to choose a password.',
      );
    }

    // Validate password
    const isValid = await this.deps.comparePassword(password, user.password);
    if (!isValid) {
      throw new Error('Invalid Password');
    }

    const accessToken = this.generateToken(user);
    return { accessToken, user };
  }

  /**
   * G18 — mint a fresh token for an already-authenticated user. Deliberately
   * re-reads the user (and their role) rather than re-signing the old claims, so
   * a permission or role change takes effect at the next refresh instead of
   * lingering for the whole token lifetime.
   */
  async refresh(email: string) {
    const user = await this.findUserByEmail(email);
    return { accessToken: this.generateToken(user), user };
  }

  generateToken(user: any): string {
    return this.deps.signToken({ payload: this.payloadFor(user) });
  }

  /** What a token says about a person — shared by sign-in, refresh and the builder token. */
  payloadFor(user: any): Record<string, any> {
    const roleId = user.roleId !== undefined && user.roleId !== null ? user.roleId : null;
    const rawPermissions = user.rolesandpermissions?.entityPermissions || {};
    const permissions = typeof rawPermissions === 'string' ? JSON.parse(rawPermissions) : rawPermissions;

    const organizationId = user.organizationId != null ? Number(user.organizationId) : undefined;
    const payload = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roleId,
      // Display and menu use only — a role's rights are `permissions`, which the server enforces.
      roleName: typeof user.rolesandpermissions?.role === 'string' ? user.rolesandpermissions.role : null,
      permissions,
      // PG-11 — the tenant travels in the token. TenantMiddleware reads it to
      // establish the request context that the Prisma layer scopes on, so a
      // request can never act outside the tenant it authenticated into.
      organizationId,
      // A principal whose tenant is the platform sentinel (0 — see PLATFORM_ORG
      // in tenant-context) is a Super Admin: the Prisma layer bypasses ALL
      // tenant scoping for it, so it reads/writes across every organisation.
      // (An explicit isPlatformAdmin column, if the schema ever adds one, also
      // promotes.)
      isPlatformAdmin: organizationId === 0 || !!user.isPlatformAdmin,
    };
    return payload;
  }

  async hashPassword(password: string): Promise<string> {
    return this.deps.hashPassword(password);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return this.deps.comparePassword(password, hash);
  }

  async findUserByEmail(email: string): Promise<any> {
    // Email is case-insensitive (like every other app) — match regardless of
    // the casing the user typed or how the record was stored.
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await this.userRepo.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: { rolesandpermissions: true },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
