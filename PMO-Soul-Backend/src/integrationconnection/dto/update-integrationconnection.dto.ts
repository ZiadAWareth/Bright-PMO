
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum IntegrationProvider {
  idp = 'idp',
  hr = 'hr',
  inventory = 'inventory',
  finance = 'finance',
  metabase = 'metabase'
}


  export class UpdateIntegrationConnectionDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsEnum(IntegrationProvider)
    @ApiPropertyOptional({ example: 'example string', description: 'Provider', enum: IntegrationProvider })
    provider?: IntegrationProvider;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'BaseUrl' })
    baseUrl?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: 'example', description: 'Config', type: Object })
    config?: any;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsEnabled' })
    isEnabled?: boolean;
  
  }
  