
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
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


  export class UpdateApprovalRequestDto {
  
      @IsOptional()
  @IsEnum(ApprovalType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: ApprovalType })
    type?: ApprovalType;
  

      @IsOptional()
  @IsEnum(ApprovalStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: ApprovalStatus })
    status?: ApprovalStatus;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'EntityType' })
    entityType?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'EntityId' })
    entityId?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: 'example', description: 'Payload', type: Object })
    payload?: any;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'RequestedById' })
    requestedById?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'RequestedAt' })
    requestedAt?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ResolvedAt' })
    resolvedAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  