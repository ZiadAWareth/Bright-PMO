
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum Methodology {
  waterfall = 'waterfall',
  agile = 'agile',
  hybrid = 'hybrid'
}

export enum AgileFramework {
  scrum = 'scrum',
  kanban = 'kanban'
}


  export class UpdateProjectCategoryDto {
  
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
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Industry' })
    industry?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsEnum(Methodology)
    @ApiPropertyOptional({ example: 'example string', description: 'DefaultMethodology', enum: Methodology })
    defaultMethodology?: Methodology;
  

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
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsActive' })
    isActive?: boolean;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SortOrder' })
    sortOrder?: number;
  
  }
  