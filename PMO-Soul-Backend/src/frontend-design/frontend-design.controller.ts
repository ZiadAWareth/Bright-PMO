import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiExcludeEndpoint } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RequireFeature } from '../guards/features';
import { FrontendDesignService } from './frontend-design.service';
import { getTenantContext } from '../organization-scope/tenant-context';

interface AuthenticatedRequest {
  userId?: string;
  userEmail?: string;
  userUsername?: string;
  userPermissions?: Record<string, any>;
  isPlatformAdmin?: boolean;
  headers: Record<string, any>;
}

/**
 * Opening the UI Builder on this app.
 *
 * The admin panel asks for a handoff, then sends the person to the builder with a single-use
 * code. The builder's server redeems that code here and receives the access token over a direct
 * call — so the token never appears in a URL, a history entry, a Referer header or a log line.
 */
/** An administrator sees and may revoke every builder connection; anyone else, their own. */
function canManageAll(request: AuthenticatedRequest): boolean {
  return Boolean(request.isPlatformAdmin) || Boolean(request.userPermissions?.rolesandpermissions?.update);
}

@ApiTags('Frontend Design')
@Controller('frontend-design')
export class FrontendDesignController {
  constructor(private readonly design: FrontendDesignService) {}

  @Post('handoff')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, PermissionsGuard)
  // Designing the frontend means reading this app's data through the builder, so it is gated on the
  // role's "Design frontend" switch (src/guards/features.ts) — never on isPlatformAdmin alone, which
  // means Soul operator and would grant it to us while denying it to the customer.
  @RequireFeature('designFrontend')
  @ApiOperation({ summary: 'Start a UI Builder session for this app' })
  async handoff(@Req() request: AuthenticatedRequest) {
    const authorization = String(request.headers['authorization'] || '');
    const token = authorization.toLowerCase().startsWith('bearer ')
      ? authorization.slice(7).trim()
      : '';
    if (!token) {
      throw new BadRequestException('This request carried no access token to hand over.');
    }

    // WHO is captured HERE, not at redeem: the redeem call is unauthenticated by design (the code
    // is the credential), so there is nobody to ask about there. Without this the builder knows
    // the app trusts the visitor but not who they are, and demands a second login.
    const organizationId = getTenantContext()?.organizationId;
    const { code, expiresAt } = this.design.issue(String(request.userId || ''), token, {
      id: String(request.userId || ''),
      email: String(request.userEmail || ''),
      name: String(request.userUsername || ''),
      // A platform operator acts in no tenant, so null is the honest answer, not 0.
      organizationId: typeof organizationId === 'number' ? organizationId : null,
      // Not the route's gate (that is @RequirePermission above) — a fact ABOUT the person, for
      // the builder to mirror. isPlatformAdmin alone means Soul operator, so the app's own
      // administrator is recognised by the permission that decides who may do what here.
      isAdmin:
        Boolean(request.isPlatformAdmin) ||
        Boolean(request.userPermissions?.rolesandpermissions?.update),
    });
    return {
      code,
      expiresAt: new Date(expiresAt).toISOString(),
      appName: 'another test PMO',
      // Where this app answers, and where the builder lives. Both come from configuration: an
      // address baked in at generation time is what makes an app unreachable from anywhere but
      // the machine that generated it.
      appUrl: process.env.APP_PUBLIC_URL || '',
      builderUrl: process.env.SOUL_BUILDER_URL || '',
    };
  }

  @Post('redeem')
  @ApiExcludeEndpoint()
  // No AuthGuard by design: the CODE is the credential, and the caller is the builder's server,
  // which has no user session here. It is single-use and expires in two minutes.
  async redeem(@Body() body: { code?: string }) {
    const found = this.design.redeem(String(body?.code || ''));
    if (!found) {
      // One message for "never existed", "already used" and "expired": distinguishing them would
      // let a caller probe which codes are real.
      throw new BadRequestException('That link is no longer valid. Open the builder again from the app.');
    }
    // The identity rides along so the builder can sign this person in rather than asking them to
    // log in again. It is whatever was true at handoff time, stored with the code.
    // builderKey: a durable, read-only connection for "Refresh from app", so the builder no longer
    // depends on this person's 1-day session token. A builder that ignores it keeps working.
    let builderKey: string | null = null;
    try {
      builderKey = await this.design.issueBuilderKey(found.user);
    } catch {
      builderKey = null;   // never let a key problem block the hand-off itself
    }
    return {
      token: found.token,
      appName: 'another test PMO',
      appUrl: process.env.APP_PUBLIC_URL || '',
      user: found.user,
      ...(builderKey ? { builderKey } : {}),
    };
  }

  @Post('builder-token')
  @ApiExcludeEndpoint()
  // No AuthGuard by design: the KEY is the credential (32 random bytes, stored hashed), and the
  // caller is the builder's server. The token it returns opens the app-contract route only.
  async builderToken(@Body() body: { key?: string }) {
    return this.design.exchangeBuilderKey(String(body?.key || ''));
  }

  @Get('builder-keys')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'The UI Builder connections to this app' })
  listBuilderKeys(@Req() request: AuthenticatedRequest) {
    return this.design.listBuilderKeys(Number(request.userId), canManageAll(request));
  }

  @Delete('builder-keys/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Disconnect a UI Builder from this app' })
  revokeBuilderKey(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.design.revokeBuilderKey(id, Number(request.userId), canManageAll(request));
  }
}
