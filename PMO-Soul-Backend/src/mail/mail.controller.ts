import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../guards/auth.guard';
import { assertFeature } from '../guards/features';
import { MailService } from './mail.service';
import { SMTP_CONNECT_TIMEOUT_MS, validateMailUpdate } from './mail-settings';
import { BadRequestException } from '@nestjs/common';

interface AuthenticatedRequest {
  userEmail?: string;
  userPermissions?: Record<string, Record<string, boolean> | undefined>;
  isPlatformAdmin?: boolean;
}

/**
 * The app's mail settings, and the test message.
 *
 * ADMIN ONLY, gated the same way the AI provider key is: "may edit roles" is the closest thing a
 * generated app has to "administers this app", and an SMTP password is exactly as sensitive as a
 * provider key — it can send mail as the company. isPlatformAdmin (the Soul operator, org 0) also
 * passes, as it does everywhere else.
 */
@ApiTags('Mail')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('mail')
export class MailController {
  constructor(private readonly mail: MailService) {}

  /** The role's "Sign-in & email" switch (src/guards/features.ts). */
  private assertAdmin(request: AuthenticatedRequest): void {
    assertFeature(request, 'signInSettings');
  }

  @Get('settings')
  @ApiOperation({ summary: 'How this app sends mail (administrators only). Never returns the password.' })
  async describe(@Req() request: AuthenticatedRequest) {
    this.assertAdmin(request);
    return this.mail.describe();
  }

  @Put('settings')
  @ApiOperation({ summary: 'Save the mail settings (administrators only)' })
  async save(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    this.assertAdmin(request);
    const checked = validateMailUpdate(body);
    if (!checked.ok) throw new BadRequestException(checked.message);
    return this.mail.save(checked.value, request.userEmail);
  }

  @Post('test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a test message with the saved settings (administrators only)' })
  async test(@Req() request: AuthenticatedRequest, @Body() body: { to?: string }) {
    this.assertAdmin(request);
    const to = String(body?.to ?? '').trim() || String(request.userEmail ?? '').trim();
    if (!to) throw new BadRequestException('Give an address to send the test message to.');
    try {
      const result = await this.mail.sendTest(to);
      if (!result.sent) {
        // Reported as a failure the admin can act on, not as a cheerful 200: "no transport
        // configured" is the single most likely reason a test does nothing.
        throw new BadRequestException(
          'Nothing was sent: this app has no mail transport configured (' + result.via + ').',
        );
      }
      return { sent: true, to, source: result.source };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      const e = err as Error & { code?: string };
      // A connection that never answers is almost always the HOST blocking the port, not a wrong
      // password — say so, with the way out, instead of a bare "Connection timeout".
      if (e.code === 'ETIMEDOUT' || e.code === 'ECONNECTION' || /timeout/i.test(e.message || '')) {
        const settings = await this.mail.describe();
        throw new BadRequestException(
          'Could not reach ' + (settings.host || 'the mail server') + ' on port ' + (settings.port ?? '?') +
          ' within ' + SMTP_CONNECT_TIMEOUT_MS / 1000 + ' seconds. Many cloud hosts block outgoing mail on ports 25, 465 and 587 ' +
          '(DigitalOcean does). Use a provider that also listens on another port — Resend on 2465 with TLS on, or 2587 with it off.',
        );
      }
      // The provider's own words. "Invalid login: 535" is the message that solves the problem.
      throw new BadRequestException('The test message failed: ' + e.message);
    }
  }
}
