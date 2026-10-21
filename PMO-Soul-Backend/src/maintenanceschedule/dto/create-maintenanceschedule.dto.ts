
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

export enum MaintenanceTrigger {
  time_based = 'time_based',
  usage_based = 'usage_based',
  condition_based = 'condition_based',
  regulatory = 'regulatory'
}

export enum MaintenanceStatus {
  scheduled = 'scheduled',
  in_progress = 'in_progress',
  completed = 'completed',
  overdue = 'overdue',
  cancelled = 'cancelled'
}

export enum Priority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical'
}


export class CreateMaintenanceScheduleDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ResourceId' })
  resourceId: number;


  @IsEnum(MaintenanceType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: MaintenanceType })
  type: MaintenanceType;


  @IsEnum(MaintenanceTrigger)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'TriggerType', enum: MaintenanceTrigger })
  triggerType: MaintenanceTrigger;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'TriggerValue' })
  triggerValue: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'NextDueDate' })
  nextDueDate: Date;


  @IsEnum(MaintenanceStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: MaintenanceStatus })
  status: MaintenanceStatus;


  @IsEnum(Priority)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Priority', enum: Priority })
  priority: Priority;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'EstimatedHours' })
  estimatedHours?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'EstimatedCost' })
  estimatedCost?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
