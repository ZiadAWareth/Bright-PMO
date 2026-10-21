
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum InspectionStatus {
  scheduled = 'scheduled',
  in_progress = 'in_progress',
  passed = 'passed',
  failed = 'failed'
}


  export class UpdateInspectionDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Kind' })
    kind?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ScheduledAt' })
    scheduledAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'InspectorId' })
    inspectorId?: number;
  

      @IsOptional()
  @IsEnum(InspectionStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: InspectionStatus })
    status?: InspectionStatus;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
    notes?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
    completedAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  