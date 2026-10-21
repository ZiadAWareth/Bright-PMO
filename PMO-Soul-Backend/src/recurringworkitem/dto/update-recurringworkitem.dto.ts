
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum WorkItemType {
  epic = 'epic',
  feature = 'feature',
  story = 'story',
  task = 'task',
  subtask = 'subtask',
  bug = 'bug',
  milestone = 'milestone'
}

export enum RecurrenceFrequency {
  daily = 'daily',
  weekly = 'weekly',
  monthly = 'monthly',
  quarterly = 'quarterly',
  yearly = 'yearly'
}


  export class UpdateRecurringWorkItemDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WbsNodeId' })
    wbsNodeId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Title' })
    title?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsEnum(WorkItemType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: WorkItemType })
    type?: WorkItemType;
  

      @IsOptional()
  @IsEnum(RecurrenceFrequency)
    @ApiPropertyOptional({ example: 'example string', description: 'Frequency', enum: RecurrenceFrequency })
    frequency?: RecurrenceFrequency;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
    startDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'EndDate' })
    endDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LastCreatedAt' })
    lastCreatedAt?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsActive' })
    isActive?: boolean;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  