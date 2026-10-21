import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');
import { runWithTenant, type TenantContext } from './tenant-context';

/**
 * Global middleware: decodes the JWT (independently of AuthGuard, which runs
 * later) and establishes the tenant context for the whole request lifetime.
 *
 * No/invalid token → empty context (public routes read User by email, which is
 * not tenant-scoped; protected routes are still blocked by AuthGuard).
 */
/**
 * Routes that identify a person by what they TYPE (email, password, code, link), never by a token.
 * A token still sitting in the browser from an earlier session must not scope them: signed in as an
 * organization user, then signing in as the platform Super Admin, the lookup was filtered to that
 * organization and answered "User not found".
 */
const CREDENTIAL_ROUTES = /^\/api\/auth\/(login|register|setup-password|forgot-password|request-code|verify-code|methods)\/?(\?|$)/;

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    let ctx: TenantContext = {};
    const auth = CREDENTIAL_ROUTES.test(req.originalUrl || req.url || '') ? undefined : req.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      const token = auth.slice(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
        const p = decoded?.payload || decoded;
        ctx = {
          organizationId: p?.organizationId != null ? Number(p.organizationId) : undefined,
          isPlatformAdmin: !!p?.isPlatformAdmin,
          userId: p?.userId != null ? String(p.userId) : undefined,
          userEmail: p?.email,
        };
      } catch {
        ctx = {};
      }
    }
    runWithTenant(ctx, () => next());
  }
}
