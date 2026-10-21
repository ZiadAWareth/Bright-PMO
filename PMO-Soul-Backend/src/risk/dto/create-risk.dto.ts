
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum RiskCategory {
  technical = 'technical',
  schedule = 'schedule',
  cost = 'cost',
  resource = 'resource',
  quality = 'quality',
  communication = 'communication',
  external = 'external',
  regulatory = 'regulatory',
  environmental = 'environmental',
  security = 'security',
  other = 'other'
}

export enum RiskRating {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical'
}

export enum RiskStatus {
  identified = 'identified',
  assessed = 'assessed',
  monitoring = 'monitoring',
  mitigated = 'mitigated',
  escalated = 'escalated',
  closed = 'closed'
}

export enum RiskApprovalStatus {
  not_submitted = 'not_submitted',
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected'
}


export class CreateRiskDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'OwnerId' })
  ownerId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsEnum(RiskCategory)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Category', enum: RiskCategory })
  category: RiskCategory;


  @IsEnum(RiskRating)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Impact', enum: RiskRating })
  impact: RiskRating;


  @IsEnum(RiskRating)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Probability', enum: RiskRating })
  probability: RiskRating;


  @IsEnum(RiskRating)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Level', enum: RiskRating })
  level: RiskRating;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'Score' })
  score: number;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'LikelihoodScore' })
  likelihoodScore?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'ImpactScore' })
  impactScore?: string;


  @IsEnum(RiskStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: RiskStatus })
  status: RiskStatus;


  @IsEnum(RiskApprovalStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ApprovalStatus', enum: RiskApprovalStatus })
  approvalStatus: RiskApprovalStatus;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'IdentifiedOn' })
  identifiedOn: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LastReviewedAt' })
  lastReviewedAt?: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'NextReviewOn' })
  nextReviewOn?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'ReviewFrequencyDays' })
  reviewFrequencyDays?: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
