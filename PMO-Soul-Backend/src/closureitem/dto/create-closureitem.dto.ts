
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum ClosureItemType {
  document = 'document',
  checklist = 'checklist',
  inspection = 'inspection',
  punch_list = 'punch_list',
  handover = 'handover',
  approval = 'approval',
  retrospective = 'retrospective',
  release_notes = 'release_notes',
  custom = 'custom'
}

export enum ClosureItemStatus {
  pending = 'pending',
  complete = 'complete',
  waived = 'waived'
}


export class CreateClosureItemDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ClosureId' })
  closureId: number;


  @IsEnum(ClosureItemType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: ClosureItemType })
  type: ClosureItemType;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Title' })
  title: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'DocumentType' })
  documentType?: string;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsRequired' })
  isRequired: boolean;


  @IsEnum(ClosureItemStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: ClosureItemStatus })
  status: ClosureItemStatus;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'AutoChecked' })
  autoChecked: boolean;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'DocumentId' })
  documentId?: number;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
  notes?: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SortOrder' })
  sortOrder: number;


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
