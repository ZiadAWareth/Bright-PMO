
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";

export class CreateProgressReportDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'WorkItemId' })
  workItemId: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'ResourceAssignmentId' })
  resourceAssignmentId?: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ReportedById' })
  reportedById: number;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ActualProgressPct' })
  actualProgressPct: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ActualHours' })
  actualHours: string;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsOnPlan' })
  isOnPlan: boolean;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
  notes?: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'ReportedAt' })
  reportedAt: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
