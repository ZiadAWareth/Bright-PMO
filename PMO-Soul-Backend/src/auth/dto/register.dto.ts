
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MAX_EMAIL_LENGTH, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '../registration';

/**
 * The body of POST /auth/register — a sign-up REQUEST, not an account.
 *
 * FOUR PROPERTIES, AND NOT ONE MORE.
 * main.ts runs ValidationPipe with { whitelist: true, forbidNonWhitelisted: true }, so a property
 * that is not declared here is not stripped quietly — the request is refused with 400. That is
 * what stops a stranger from posting roleId, organizationId or isPlatformAdmin and promoting
 * themselves on the way in. Adding a field to this class widens what the public may send, so add
 * one only with that in mind. The role and the organisation are decided by the sign-up WORKFLOW's
 * Create User Account step, which reads them from its own configuration; they are not inputs here
 * and cannot be reached from a variable.
 */
export class RegisterDto {
    @ApiProperty({ example: 'ada@example.com', description: 'Email address, used to sign in' })
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(MAX_EMAIL_LENGTH)
    email: string;

    @ApiProperty({ example: 'correct horse battery', description: 'At least eight characters' })
    @IsString()
    @MinLength(MIN_PASSWORD_LENGTH)
    @MaxLength(MAX_PASSWORD_LENGTH)
    password: string;

    @ApiPropertyOptional({ example: 'Ada', description: 'First name' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    firstName?: string;

    @ApiPropertyOptional({ example: 'Lovelace', description: 'Last name' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    lastName?: string;
}
