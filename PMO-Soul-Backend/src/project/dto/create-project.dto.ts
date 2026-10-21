
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
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


export class CreateProjectDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Code' })
  code: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'KeyPrefix' })
  keyPrefix: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'WorkItemSeq' })
  workItemSeq: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'CategoryId' })
  categoryId: number;


  @IsEnum(Methodology)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Methodology', enum: Methodology })
  methodology: Methodology;


  @IsOptional()
  @IsEnum(AgileFramework)
  @ApiPropertyOptional({ example: 'example string', description: 'AgileFramework', enum: AgileFramework })
  agileFramework?: AgileFramework;


  @IsEnum(EstimationUnit)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'EstimationUnit', enum: EstimationUnit })
  estimationUnit: EstimationUnit;


  @IsEnum(ProgressMethod)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ProgressMethod', enum: ProgressMethod })
  progressMethod: ProgressMethod;


  @IsEnum(ProjectStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: ProjectStatus })
  status: ProjectStatus;


  @IsEnum(Priority)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Priority', enum: Priority })
  priority: Priority;


  @IsEnum(StrategicValue)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'StrategicValue', enum: StrategicValue })
  strategicValue: StrategicValue;


  @IsEnum(ComplianceStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Compliance', enum: ComplianceStatus })
  compliance: ComplianceStatus;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'EpsId' })
  epsId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'PortfolioId' })
  portfolioId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ManagerId' })
  managerId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'CreatedById' })
  createdById: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'CalendarId' })
  calendarId?: number;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
  startDate: Date;


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


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'EnforceDependencies' })
  enforceDependencies: boolean;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'BudgetAmount' })
  budgetAmount: string;


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


  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ example: 'example string', description: 'Tags' })
  tags: string[];


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'FeasibilityScore' })
  feasibilityScore?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LastAnalyzedAt' })
  lastAnalyzedAt?: Date;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ProgressPct' })
  progressPct: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ActualCost' })
  actualCost: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'AllocatedCost' })
  allocatedCost: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'Roi' })
  roi?: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'HealthScore' })
  healthScore: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'RiskScore' })
  riskScore: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'QualityScore' })
  qualityScore: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ArchivedAt' })
  archivedAt?: Date;

}
