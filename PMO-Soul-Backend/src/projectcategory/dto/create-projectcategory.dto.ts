
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum Methodology {
  waterfall = 'waterfall',
  agile = 'agile',
  hybrid = 'hybrid'
}

export enum AgileFramework {
  scrum = 'scrum',
  kanban = 'kanban'
}


export class CreateProjectCategoryDto {

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
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Industry' })
  industry?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsEnum(Methodology)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'DefaultMethodology', enum: Methodology })
  defaultMethodology: Methodology;


  @IsOptional()
  @IsEnum(AgileFramework)
  @ApiPropertyOptional({ example: 'example string', description: 'DefaultAgileFramework', enum: AgileFramework })
  defaultAgileFramework?: AgileFramework;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'LifecycleTemplateId' })
  lifecycleTemplateId?: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'ClosureTemplateId' })
  closureTemplateId?: number;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsActive' })
  isActive: boolean;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SortOrder' })
  sortOrder: number;

}
