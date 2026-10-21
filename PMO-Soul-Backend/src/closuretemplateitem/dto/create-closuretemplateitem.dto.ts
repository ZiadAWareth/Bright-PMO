
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


export class CreateClosureTemplateItemDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'TemplateId' })
  templateId: number;


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


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SortOrder' })
  sortOrder: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
