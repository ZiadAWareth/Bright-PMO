
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum ConflictType {
  resource_overallocation = 'resource_overallocation',
  skill_mismatch = 'skill_mismatch',
  dependency_violation = 'dependency_violation',
  timeline_conflict = 'timeline_conflict',
  budget_exceeded = 'budget_exceeded',
  resource_unavailable = 'resource_unavailable',
  team_conflict = 'team_conflict'
}

export enum ConflictSeverity {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical'
}


  export class UpdateProjectConflictDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsEnum(ConflictType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: ConflictType })
    type?: ConflictType;
  

      @IsOptional()
  @IsEnum(ConflictSeverity)
    @ApiPropertyOptional({ example: 'example string', description: 'Severity', enum: ConflictSeverity })
    severity?: ConflictSeverity;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
    @ApiPropertyOptional({ example: 1, description: 'AffectedWorkItemIds' })
    affectedWorkItemIds?: number[];
  

      @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
    @ApiPropertyOptional({ example: 1, description: 'AffectedResourceIds' })
    affectedResourceIds?: number[];
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'SuggestedResolution' })
    suggestedResolution?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ResolvedAt' })
    resolvedAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  