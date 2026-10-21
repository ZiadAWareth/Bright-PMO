
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
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


  export class UpdateClosureTemplateItemDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'TemplateId' })
    templateId?: number;
  

      @IsOptional()
  @IsEnum(ClosureItemType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: ClosureItemType })
    type?: ClosureItemType;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Title' })
    title?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'DocumentType' })
    documentType?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsRequired' })
    isRequired?: boolean;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SortOrder' })
    sortOrder?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  