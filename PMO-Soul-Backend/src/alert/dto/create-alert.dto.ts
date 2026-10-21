
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
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


export class CreateAlertDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsEnum(AlertType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: AlertType })
  type: AlertType;


  @IsEnum(AlertSeverity)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Severity', enum: AlertSeverity })
  severity: AlertSeverity;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Message' })
  message: string;


  @IsOptional()
  @ApiPropertyOptional({ example: 'example', description: 'Metadata' })
  metadata?: any;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'Escalated' })
  escalated: boolean;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'TriggeredAt' })
  triggeredAt: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ResolvedAt' })
  resolvedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
