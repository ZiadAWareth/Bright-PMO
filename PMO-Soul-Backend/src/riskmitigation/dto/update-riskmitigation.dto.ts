
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  export enum MitigationType {
  avoid = 'avoid',
  transfer = 'transfer',
  mitigate = 'mitigate',
  accept = 'accept',
  contingency = 'contingency'
}

export enum MitigationStatus {
  planned = 'planned',
  in_progress = 'in_progress',
  completed = 'completed',
  on_hold = 'on_hold',
  cancelled = 'cancelled',
  overdue = 'overdue'
}


  export class UpdateRiskMitigationDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'RiskId' })
    riskId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WorkItemId' })
    workItemId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OwnerId' })
    ownerId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'AssigneeId' })
    assigneeId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'ActionPlan' })
    actionPlan?: string;
  

      @IsOptional()
  @IsEnum(MitigationType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: MitigationType })
    type?: MitigationType;
  

      @IsOptional()
  @IsEnum(MitigationStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: MitigationStatus })
    status?: MitigationStatus;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
    startDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'DueDate' })
    dueDate?: Date;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ProgressPct' })
    progressPct?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
    completedAt?: Date;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
    notes?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LastReminderAt' })
    lastReminderAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  