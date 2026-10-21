
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";

export class CreateEquipmentSiteLogDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ResourceId' })
  resourceId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SiteId' })
  siteId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'LoggedById' })
  loggedById: number;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'CheckedInAt' })
  checkedInAt: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CheckedOutAt' })
  checkedOutAt?: Date;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'UsageHours' })
  usageHours?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'ConditionBefore' })
  conditionBefore?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'ConditionAfter' })
  conditionAfter?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
  notes?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
