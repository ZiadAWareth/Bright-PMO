
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";

export class CreateRefreshTokenDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'UserId' })
  userId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'TokenHash' })
  tokenHash: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'ExpiresAt' })
  expiresAt: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'RevokedAt' })
  revokedAt?: Date;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'UserAgent' })
  userAgent?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
