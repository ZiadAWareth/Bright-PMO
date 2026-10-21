
  import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    Patch,
    Post,
    Put,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { clientIpOf, validateSignUpSettings } from './registration';
import { validateAuthMethods } from './auth-methods';
import { AuthGuard } from 'src/guards/auth.guard';
import { assertFeature } from 'src/guards/features';
import { BadRequestException } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { 
    LoginResponseDto, 
    LogoutResponseDto 
} from './dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private authService:AuthService){}

    /**
     * Who may administer this app's front door: the role's "Sign-in & email" switch
     * (src/guards/features.ts). It used to borrow "may edit roles" as a stand-in for "is an
     * administrator"; a role saved before the switch existed still answers that way.
     */
    private assertAdmin(request: any): void {
        assertFeature(request, 'signInSettings');
    }


    @ApiOperation({
        summary: 'Login user',
        description: 'Authenticates a user with email and password. Returns access token.'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Login successful. Returns access token, and user information.',
        type: LoginResponseDto
    })
    @ApiResponse({ 
        status: 400, 
        description: 'Invalid email password'
    })
    @ApiResponse({ 
        status: 404, 
        description: 'User not found with the provided email'
    })
    @Post('login')
    login(@Body()loginDto:LoginDto)
    {
        return this.authService.login(loginDto);
    }


    /**
     * PUBLIC SIGN-UP: creates the account, with the role and organisation an administrator chose in
     * Settings → Sign-in & Email. Off by default; while off the answer is a 403 saying so, and the
     * app contract publishes the same fact as auth.signUpEnabled.
     *
     * NO GUARD, ON PURPOSE — a person who has no account cannot present a token. What protects
     * it instead:
     *   - RegisterDto declares four properties and main.ts runs ValidationPipe with
     *     forbidNonWhitelisted, so a body carrying roleId, organizationId or isPlatformAdmin is
     *     refused with 400. The role and the organisation are the setting's decision.
     *   - A per-IP attempt limiter in AuthService. It lives in this process only: a floor against
     *     a script hammering one box, not a guarantee across several instances.
     *   - No tokens come back: the person signs in through /auth/login like anybody else.
     */
    @ApiOperation({
        summary: 'Sign up',
        description: 'Creates an account with the role this app gives new sign-ups. Public. Never returns a token.'
    })
    @ApiResponse({
        status: 201,
        description: 'The account exists. { status: created, accountCreated: true, message }'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid email, password too short, email already in use, or an unexpected field in the body'
    })
    @ApiResponse({
        status: 403,
        description: 'This app does not offer self-registration (public sign-up is off)'
    })
    @ApiResponse({
        status: 429,
        description: 'Too many sign-up attempts from this address'
    })
    @Post('register')
    register(@Body() registerDto: RegisterDto, @Request() req: any)
    {
        return this.authService.register(registerDto, clientIpOf(req));
    }


    /**
     * G18 — sliding session. The access token used to be valid for 30 days with
     * no way to renew it: when it finally expired the user was hard-redirected to
     * /login mid-task and lost whatever they had typed.
     *
     * This mints a fresh token for a caller whose current token is still valid,
     * so the frontend can roll the session forward before it lapses. It is a
     * SLIDING SESSION, not a revocable refresh-token scheme — that needs a stored,
     * separately-scoped refresh token, which the generated schema has no table for
     * yet. Once a token has actually expired the user must log in again.
     */
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Refresh the access token',
        description: 'Issues a new access token to a caller whose current token is still valid, so a long session does not end abruptly.'
    })
    @ApiResponse({
        status: 200,
        description: 'A new access token'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - missing or expired authentication token'
    })
    @Post('refresh')
    refresh(@Request() req: any)
    {
        return this.authService.refreshToken(req.userEmail);
    }


    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Logout user',
        description: 'Logs out the authenticated user. Requires a valid authentication token.'
    })
    @ApiResponse({
        status: 200,
        description: 'Logged out successfully',
        type: LogoutResponseDto
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - missing or invalid authentication token'
    })
    @Post('logout')
    logout(@Request() req){
        return this.authService.logout(req.userId);
    }

    // ── Your own profile ─────────────────────────────────────────────────────────────────────
    //
    // Signed in, and ONLY about the person the token names (req.userEmail) — there is no id in any
    // of these routes, so they cannot be pointed at somebody else.

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Your own profile' })
    @Get('profile')
    profile(@Request() req: any) {
        return this.authService.profile(req.userEmail);
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change your own name. Returns the profile and a fresh token carrying it.' })
    @Patch('profile')
    updateProfile(@Request() req: any, @Body() body: unknown) {
        return this.authService.updateProfile(req.userEmail, body);
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Change your own password (current password required). Signs out every other session.' })
    @ApiResponse({ status: 429, description: 'Too many wrong current passwords' })
    @Post('change-password')
    @HttpCode(200)
    changePassword(@Request() req: any, @Body() body: { currentPassword?: string; newPassword?: string }) {
        return this.authService.changePassword(req.userEmail, body ?? {});
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Sign out every other session of yours. This one continues with a fresh token.' })
    @Post('sign-out-other-sessions')
    @HttpCode(200)
    signOutOtherSessions(@Request() req: any) {
        return this.authService.signOutOtherSessions(req.userEmail);
    }

    // ── How this app signs people in ─────────────────────────────────────────────────────────

    /**
     * PUBLIC, because a sign-in screen needs it before anybody is signed in.
     *
     * The app contract publishes the same fact as auth.methods, but the contract is behind
     * AuthGuard (it is a permission-filtered document), so a front door cannot read it. This is the
     * one bit of it that has to be readable by an anonymous caller.
     */
    @ApiOperation({ summary: 'Which sign-in methods this app offers. Public.' })
    @Get('methods')
    methods() {
        return this.authService.publicMethods();
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Read the sign-in method setting (administrators only)' })
    @Get('settings')
    authSettings(@Request() req: any) {
        this.assertAdmin(req);
        return this.authService.describeAuthSettings();
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Choose how people sign in (administrators only)' })
    @Put('settings')
    saveAuthSettings(@Request() req: any, @Body() body: unknown) {
        this.assertAdmin(req);
        const checked = validateAuthMethods(body);
        if (!checked.ok) throw new BadRequestException(checked.message);
        return this.authService.saveAuthSettings(checked.value, req.userEmail);
    }

    /**
     * Turn public sign-up on or off, and choose the role and organisation a new account gets.
     * Read back through GET settings (its "signUp" part).
     */
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Turn public sign-up on or off (administrators only)' })
    @Put('settings/sign-up')
    saveSignUpSettings(@Request() req: any, @Body() body: unknown) {
        this.assertAdmin(req);
        const checked = validateSignUpSettings(body);
        if (!checked.ok) throw new BadRequestException(checked.message);
        return this.authService.saveSignUpSettings(checked.value, req.userEmail);
    }

    // ── Invitations ──────────────────────────────────────────────────────────────────────────

    /**
     * Send (or re-send) the invitation that lets somebody choose their own password.
     *
     * Administrators only, gated on the same permission every other app-administration route uses.
     * Re-sending invalidates the previous link — that is the service's doing, and the reason the
     * route is a plain POST rather than one endpoint for "invite" and another for "re-invite".
     */
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Email an account an invitation to set its password (administrators only)' })
    @Post('invite')
    @HttpCode(200)
    invite(@Request() req: any, @Body() body: { userId?: number | string }) {
        this.assertAdmin(req);
        const userId = Number(body?.userId);
        if (!Number.isFinite(userId)) throw new BadRequestException('Say which account to invite.');
        return this.authService.sendInvite(userId, req.userEmail);
    }

    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Accounts that cannot sign in yet (administrators only)' })
    @Get('invites/pending')
    pendingInvites(@Request() req: any) {
        this.assertAdmin(req);
        return this.authService.pendingInvites();
    }

    /**
     * Is an invitation link still good? PUBLIC and read-only, so the screen can say "this link has
     * expired" up front instead of failing on submit.
     */
    @ApiOperation({ summary: 'Whether an invitation link can still be used. Public.' })
    @Get('setup-password')
    checkSetupToken(@Query('token') token: string) {
        return this.authService.checkSetupToken(String(token ?? ''));
    }

    /** Set the password an invited person chose. PUBLIC — the single-use token is the credential. */
    @ApiOperation({ summary: 'Set a password with an invitation token. Public.' })
    @Post('setup-password')
    @HttpCode(200)
    setupPassword(@Body() body: { token?: string; password?: string }) {
        return this.authService.setupPassword(String(body?.token ?? ''), String(body?.password ?? ''));
    }

    /**
     * "Forgot password?" PUBLIC. Emails a 30-minute, single-use link to /set-password, and answers
     * identically for an address that has an account and one that does not. Available only while the
     * app can send email — GET /auth/methods says so as passwordReset.
     */
    @ApiOperation({ summary: 'Email a password reset link. Public; the answer never reveals whether the address exists.' })
    @ApiResponse({ status: 200, description: 'The same answer for every address' })
    @ApiResponse({ status: 403, description: 'Password reset is not available (no email delivery, or codes-only sign-in)' })
    @ApiResponse({ status: 429, description: 'Too many requests for this address or from this network' })
    @Post('forgot-password')
    @HttpCode(200)
    forgotPassword(@Body() body: { email?: string }, @Request() req: any) {
        return this.authService.requestPasswordReset(body?.email, clientIpOf(req));
    }

    // ── One-time codes ───────────────────────────────────────────────────────────────────────

    /**
     * PUBLIC. Answers identically for an address that has an account and one that does not — see
     * AuthService.requestLoginCode. Rate-limited per email AND per IP.
     */
    @ApiOperation({ summary: 'Email a one-time sign-in code. Public; the answer never reveals whether the address exists.' })
    @ApiResponse({ status: 200, description: 'The same answer for every address' })
    @ApiResponse({ status: 403, description: 'This app does not offer one-time codes' })
    @ApiResponse({ status: 429, description: 'Too many requests for this address or from this network' })
    @Post('request-code')
    @HttpCode(200)
    requestCode(@Body() body: { email?: string }, @Request() req: any) {
        return this.authService.requestLoginCode(body?.email, clientIpOf(req));
    }

    /** PUBLIC. Returns exactly what /auth/login returns. */
    @ApiOperation({ summary: 'Exchange a one-time code for an access token. Public.' })
    @ApiResponse({ status: 200, description: 'Access token and user, the same shape as login', type: LoginResponseDto })
    @ApiResponse({ status: 400, description: 'The code is wrong, expired, used, or has run out of attempts' })
    @ApiResponse({ status: 429, description: 'Too many attempts from this network' })
    @Post('verify-code')
    @HttpCode(200)
    verifyCode(@Body() body: { email?: string; code?: string }, @Request() req: any) {
        return this.authService.verifyLoginCode(body?.email, body?.code, clientIpOf(req));
    }
}

