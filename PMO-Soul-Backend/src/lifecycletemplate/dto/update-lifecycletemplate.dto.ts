
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum Methodology {
  waterfall = 'waterfall',
  agile = 'agile',
  hybrid = 'hybrid'
}

export enum LifecycleGating {
  sequential = 'sequential',
  free = 'free'
}


  export class UpdateLifecycleTemplateDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsEnum(Methodology)
    @ApiPropertyOptional({ example: 'example string', description: 'Methodology', enum: Methodology })
    methodology?: Methodology;
  

      @IsOptional()
  @IsEnum(LifecycleGating)
    @ApiPropertyOptional({ example: 'example string', description: 'Gating', enum: LifecycleGating })
    gating?: LifecycleGating;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsDefault' })
    isDefault?: boolean;
  
  }
  