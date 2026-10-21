
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum LifecycleGating {
  sequential = 'sequential',
  free = 'free'
}

export enum LifecycleStepStatus {
  locked = 'locked',
  available = 'available',
  in_progress = 'in_progress',
  completed = 'completed',
  skipped = 'skipped'
}


  export class UpdateProjectLifecycleStepDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Key' })
    key?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Title' })
    title?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SortOrder' })
    sortOrder?: number;
  

      @IsOptional()
  @IsEnum(LifecycleGating)
    @ApiPropertyOptional({ example: 'example string', description: 'Gating', enum: LifecycleGating })
    gating?: LifecycleGating;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsRequired' })
    isRequired?: boolean;
  

      @IsOptional()
  @IsEnum(LifecycleStepStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: LifecycleStepStatus })
    status?: LifecycleStepStatus;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
    completedAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CompletedById' })
    completedById?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  