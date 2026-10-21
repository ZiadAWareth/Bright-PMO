
    import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedRequest } from './types';
import { SESSION_REVOKED_MESSAGE, isRevoked } from '../auth/session-revocations';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }
    
    // Validate JWT format before attempting verification
    if (!this.isValidJwtFormat(token)) {
      throw new UnauthorizedException('Invalid token format');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      // Nothing about the token is logged: its payload names the person and their permissions, and
      // the app's log is not the place for either.
      if (error?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token has expired');
      }
      throw new UnauthorizedException('Invalid or malformed access token');
    }

    // Extract user information from JWT payload. NestJS JWT returns the payload directly (not
    // wrapped), but both shapes are handled for compatibility.
    const decodedPayload = payload.payload || payload;

    // Signed out everywhere: a password reset ended every session issued before it.
    if (isRevoked(decodedPayload.userId, payload.iat)) {
      throw new UnauthorizedException(SESSION_REVOKED_MESSAGE);
    }

    {
      request.userId = decodedPayload.userId;
      request.userRoleId = decodedPayload.roleId !== undefined ? decodedPayload.roleId : null;
      request.userPermissions = decodedPayload.permissions || {};
      request.userEmail = decodedPayload.email;
      request.userUsername = decodedPayload.username;
      request.isPlatformAdmin = !!decodedPayload.isPlatformAdmin;

      // A UI Builder token (scope 'builder', minted from a builder key) reads the app's description
      // and nothing else: refused on every other route, so a builder key can never act as the user.
      if (decodedPayload.scope === 'builder') {
        const path = String((request as any).originalUrl || (request as any).url || '').split('?')[0];
        if (!(path.endsWith('/app-contract') || path.endsWith('/app-contract/'))) {
          throw new UnauthorizedException('A builder token can only read the app contract');
        }
      }
    }
    return true;
  }

  private extractTokenFromHeader(request: AuthenticatedRequest): string | undefined {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return undefined;
    }
    
    const [type, token] = authHeader.split(' ');
    
    if (type !== 'Bearer' || !token) {
      return undefined;
    }
    
    // Trim whitespace from token
    const trimmedToken = token.trim();
    
    // Return undefined if token is empty after trimming
    return trimmedToken.length > 0 ? trimmedToken : undefined;
  }

  private isValidJwtFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // JWT format: header.payload.signature (3 parts separated by dots)
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }
}
