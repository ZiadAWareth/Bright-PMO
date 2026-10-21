
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum OrganizationStatus {
  trial = 'trial',
  active = 'active',
  suspended = 'suspended'
}


  export class UpdateOrganizationSettingsDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsEnum(OrganizationStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: OrganizationStatus })
    status?: OrganizationStatus;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'IdpOrganizationId' })
    idpOrganizationId?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Timezone' })
    timezone?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'DefaultCurrency' })
    defaultCurrency?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'LogoStorageKey' })
    logoStorageKey?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: 'example', description: 'Settings', type: Object })
    settings?: any;
  
  }
  