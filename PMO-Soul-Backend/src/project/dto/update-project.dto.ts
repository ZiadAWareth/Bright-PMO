
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  export enum Methodology {
  waterfall = 'waterfall',
  agile = 'agile',
  hybrid = 'hybrid'
}

export enum AgileFramework {
  scrum = 'scrum',
  kanban = 'kanban'
}

export enum EstimationUnit {
  hours = 'hours',
  story_points = 'story_points'
}

export enum ProgressMethod {
  duration_weighted = 'duration_weighted',
  wbs_weighted = 'wbs_weighted',
  story_points = 'story_points',
  item_count = 'item_count',
  manual = 'manual'
}

export enum ProjectStatus {
  draft = 'draft',
  pending_approval = 'pending_approval',
  rejected = 'rejected',
  planning = 'planning',
  active = 'active',
  on_hold = 'on_hold',
  closing = 'closing',
  closed = 'closed',
  cancelled = 'cancelled'
}

export enum Priority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical'
}

export enum StrategicValue {
  low = 'low',
  medium = 'medium',
  high = 'high'
}

export enum ComplianceStatus {
  pending = 'pending',
  compliant = 'compliant',
  non_compliant = 'non_compliant'
}


  export class UpdateProjectDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Code' })
    code?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'KeyPrefix' })
    keyPrefix?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WorkItemSeq' })
    workItemSeq?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CategoryId' })
    categoryId?: number;
  

      @IsOptional()
  @IsEnum(Methodology)
    @ApiPropertyOptional({ example: 'example string', description: 'Methodology', enum: Methodology })
    methodology?: Methodology;
  

      @IsOptional()
  @IsEnum(AgileFramework)
    @ApiPropertyOptional({ example: 'example string', description: 'AgileFramework', enum: AgileFramework })
    agileFramework?: AgileFramework;
  

      @IsOptional()
  @IsEnum(EstimationUnit)
    @ApiPropertyOptional({ example: 'example string', description: 'EstimationUnit', enum: EstimationUnit })
    estimationUnit?: EstimationUnit;
  

      @IsOptional()
  @IsEnum(ProgressMethod)
    @ApiPropertyOptional({ example: 'example string', description: 'ProgressMethod', enum: ProgressMethod })
    progressMethod?: ProgressMethod;
  

      @IsOptional()
  @IsEnum(ProjectStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: ProjectStatus })
    status?: ProjectStatus;
  

      @IsOptional()
  @IsEnum(Priority)
    @ApiPropertyOptional({ example: 'example string', description: 'Priority', enum: Priority })
    priority?: Priority;
  

      @IsOptional()
  @IsEnum(StrategicValue)
    @ApiPropertyOptional({ example: 'example string', description: 'StrategicValue', enum: StrategicValue })
    strategicValue?: StrategicValue;
  

      @IsOptional()
  @IsEnum(ComplianceStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Compliance', enum: ComplianceStatus })
    compliance?: ComplianceStatus;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'EpsId' })
    epsId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'PortfolioId' })
    portfolioId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ManagerId' })
    managerId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CreatedById' })
    createdById?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CalendarId' })
    calendarId?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
    startDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'PlannedEndDate' })
    plannedEndDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'MustFinishBy' })
    mustFinishBy?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ActualEndDate' })
    actualEndDate?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SprintLengthDays' })
    sprintLengthDays?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'EnforceDependencies' })
    enforceDependencies?: boolean;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'BudgetAmount' })
    budgetAmount?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'PendingBudgetAmount' })
    pendingBudgetAmount?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ExpectedRoi' })
    expectedRoi?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Location' })
    location?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Client' })
    client?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Contractor' })
    contractor?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'Size' })
    size?: string;
  

      @IsOptional()
  @IsArray()
  @IsString({ each: true })
    @ApiPropertyOptional({ example: 'example string', description: 'Tags' })
    tags?: string[];
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'FeasibilityScore' })
    feasibilityScore?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LastAnalyzedAt' })
    lastAnalyzedAt?: Date;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ProgressPct' })
    progressPct?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ActualCost' })
    actualCost?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'AllocatedCost' })
    allocatedCost?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'Roi' })
    roi?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'HealthScore' })
    healthScore?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'RiskScore' })
    riskScore?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'QualityScore' })
    qualityScore?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ArchivedAt' })
    archivedAt?: Date;
  
  }
  