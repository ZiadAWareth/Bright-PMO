
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum ChecklistCategory {
  document_verification = 'document_verification',
  financial_closure = 'financial_closure',
  stakeholder_signoff = 'stakeholder_signoff',
  resource_release = 'resource_release',
  lessons_learned = 'lessons_learned',
  final_report = 'final_report',
  contract_closure = 'contract_closure',
  custom = 'custom'
}

export enum ChecklistStatus {
  draft = 'draft',
  submitted = 'submitted',
  approved = 'approved',
  rejected = 'rejected',
  needs_revision = 'needs_revision'
}


export class CreateChecklistDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Title' })
  title: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsEnum(ChecklistCategory)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Category', enum: ChecklistCategory })
  category: ChecklistCategory;


  @IsEnum(ChecklistStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: ChecklistStatus })
  status: ChecklistStatus;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
  completedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
