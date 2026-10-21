
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";

export class CreateResourceAssignmentDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ResourceId' })
  resourceId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'WorkItemId' })
  workItemId: number;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'AllocationPct' })
  allocationPct: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
  startDate: Date;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'EndDate' })
  endDate: Date;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'PlannedHours' })
  plannedHours: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ActualHours' })
  actualHours: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'PlannedQuantity' })
  plannedQuantity?: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ProgressPct' })
  progressPct: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
