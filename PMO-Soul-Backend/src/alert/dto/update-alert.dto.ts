
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum AlertType {
  budget_threshold = 'budget_threshold',
  schedule_slip = 'schedule_slip',
  critical_path_change = 'critical_path_change',
  risk_escalation = 'risk_escalation',
  wip_limit_exceeded = 'wip_limit_exceeded',
  sprint_at_risk = 'sprint_at_risk',
  overdue_items = 'overdue_items'
}

export enum AlertSeverity {
  info = 'info',
  warning = 'warning',
  critical = 'critical'
}


  export class UpdateAlertDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsEnum(AlertType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: AlertType })
    type?: AlertType;
  

      @IsOptional()
  @IsEnum(AlertSeverity)
    @ApiPropertyOptional({ example: 'example string', description: 'Severity', enum: AlertSeverity })
    severity?: AlertSeverity;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Message' })
    message?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: 'example', description: 'Metadata', type: Object })
    metadata?: any;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'Escalated' })
    escalated?: boolean;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'TriggeredAt' })
    triggeredAt?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ResolvedAt' })
    resolvedAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  