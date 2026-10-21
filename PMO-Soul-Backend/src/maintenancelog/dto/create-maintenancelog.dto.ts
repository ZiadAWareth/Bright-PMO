
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum MaintenanceType {
  routine = 'routine',
  repair = 'repair',
  inspection = 'inspection',
  compliance = 'compliance',
  emergency = 'emergency'
}


export class CreateMaintenanceLogDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'ScheduleId' })
  scheduleId?: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ResourceId' })
  resourceId: number;


  @IsEnum(MaintenanceType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: MaintenanceType })
  type: MaintenanceType;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'PerformedAt' })
  performedAt: Date;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'PerformedById' })
  performedById: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'WorkDescription' })
  workDescription: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'PartsUsed' })
  partsUsed?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'LaborHours' })
  laborHours?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'PartsCost' })
  partsCost?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'LaborCost' })
  laborCost?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'TotalCost' })
  totalCost?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'ConditionBefore' })
  conditionBefore?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'ConditionAfter' })
  conditionAfter?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'NextServiceDate' })
  nextServiceDate?: Date;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
  notes?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
