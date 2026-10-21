
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
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


  export class UpdateRiskDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OwnerId' })
    ownerId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsEnum(RiskCategory)
    @ApiPropertyOptional({ example: 'example string', description: 'Category', enum: RiskCategory })
    category?: RiskCategory;
  

      @IsOptional()
  @IsEnum(RiskRating)
    @ApiPropertyOptional({ example: 'example string', description: 'Impact', enum: RiskRating })
    impact?: RiskRating;
  

      @IsOptional()
  @IsEnum(RiskRating)
    @ApiPropertyOptional({ example: 'example string', description: 'Probability', enum: RiskRating })
    probability?: RiskRating;
  

      @IsOptional()
  @IsEnum(RiskRating)
    @ApiPropertyOptional({ example: 'example string', description: 'Level', enum: RiskRating })
    level?: RiskRating;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'Score' })
    score?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'LikelihoodScore' })
    likelihoodScore?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ImpactScore' })
    impactScore?: string;
  

      @IsOptional()
  @IsEnum(RiskStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: RiskStatus })
    status?: RiskStatus;
  

      @IsOptional()
  @IsEnum(RiskApprovalStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'ApprovalStatus', enum: RiskApprovalStatus })
    approvalStatus?: RiskApprovalStatus;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'IdentifiedOn' })
    identifiedOn?: Date;
  

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
  