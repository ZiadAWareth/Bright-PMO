
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";

export class CreateApiKeyDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'KeyPrefix' })
  keyPrefix: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'KeyHash' })
  keyHash: string;


  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ example: 'example string', description: 'Scopes' })
  scopes: string[];


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LastUsedAt' })
  lastUsedAt?: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ExpiresAt' })
  expiresAt?: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'RevokedAt' })
  revokedAt?: Date;

}
