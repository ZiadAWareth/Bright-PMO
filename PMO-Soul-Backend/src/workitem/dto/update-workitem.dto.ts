
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  export enum WorkItemType {
  epic = 'epic',
  feature = 'feature',
  story = 'story',
  task = 'task',
  subtask = 'subtask',
  bug = 'bug',
  milestone = 'milestone'
}

export enum Priority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical'
}

export enum ConstraintType {
  asap = 'asap',
  alap = 'alap',
  must_start_on = 'must_start_on',
  must_finish_on = 'must_finish_on',
  start_no_earlier_than = 'start_no_earlier_than',
  start_no_later_than = 'start_no_later_than',
  finish_no_earlier_than = 'finish_no_earlier_than',
  finish_no_later_than = 'finish_no_later_than'
}


  export class UpdateWorkItemDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Key' })
    key?: string;
  

      @IsOptional()
  @IsEnum(WorkItemType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: WorkItemType })
    type?: WorkItemType;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Title' })
    title?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'AcceptanceCriteria' })
    acceptanceCriteria?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ParentId' })
    parentId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WbsNodeId' })
    wbsNodeId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SprintId' })
    sprintId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ReleaseId' })
    releaseId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'StatusId' })
    statusId?: number;
  

      @IsOptional()
  @IsEnum(Priority)
    @ApiPropertyOptional({ example: 'example string', description: 'Priority', enum: Priority })
    priority?: Priority;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Rank' })
    rank?: string;
  

      @IsOptional()
  @IsArray()
  @IsString({ each: true })
    @ApiPropertyOptional({ example: 'example string', description: 'Tags' })
    tags?: string[];
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ReporterId' })
    reporterId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CreatedById' })
    createdById?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
    startDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'EndDate' })
    endDate?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'DurationDays' })
    durationDays?: number;
  

      @IsOptional()
  @IsEnum(ConstraintType)
    @ApiPropertyOptional({ example: 'example string', description: 'ConstraintType', enum: ConstraintType })
    constraintType?: ConstraintType;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ConstraintDate' })
    constraintDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ActualStartDate' })
    actualStartDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ActualEndDate' })
    actualEndDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'EarlyStart' })
    earlyStart?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'EarlyFinish' })
    earlyFinish?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LateStart' })
    lateStart?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LateFinish' })
    lateFinish?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'TotalFloatDays' })
    totalFloatDays?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'FreeFloatDays' })
    freeFloatDays?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsCritical' })
    isCritical?: boolean;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ProgressWeight' })
    progressWeight?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'WorkPackage' })
    workPackage?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'StoryPoints' })
    storyPoints?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'EstimatedHours' })
    estimatedHours?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'RemainingHours' })
    remainingHours?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ActualHours' })
    actualHours?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ProgressPct' })
    progressPct?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'AddedAfterSprintStart' })
    addedAfterSprintStart?: boolean;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
    completedAt?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'DeletedAt' })
    deletedAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  