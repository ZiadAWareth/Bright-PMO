
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum ApprovalType {
  project_creation = 'project_creation',
  budget_change = 'budget_change',
  schedule_change = 'schedule_change',
  scope_change = 'scope_change',
  phase_gate = 'phase_gate',
  checklist = 'checklist',
  project_closure = 'project_closure'
}

export enum ApprovalStatus {
  waiting = 'waiting',
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  revision_requested = 'revision_requested',
  cancelled = 'cancelled'
}


export class CreateApprovalRequestDto {

  @IsEnum(ApprovalType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: ApprovalType })
  type: ApprovalType;


  @IsEnum(ApprovalStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: ApprovalStatus })
  status: ApprovalStatus;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'EntityType' })
  entityType: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'EntityId' })
  entityId: number;


  @IsOptional()
  @ApiPropertyOptional({ example: 'example', description: 'Payload' })
  payload?: any;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'RequestedById' })
  requestedById: number;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'RequestedAt' })
  requestedAt: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ResolvedAt' })
  resolvedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
