
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum OrganizationStatus {
  trial = 'trial',
  active = 'active',
  suspended = 'suspended'
}


export class CreateOrganizationSettingsDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsEnum(OrganizationStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: OrganizationStatus })
  status: OrganizationStatus;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'IdpOrganizationId' })
  idpOrganizationId?: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Timezone' })
  timezone: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'DefaultCurrency' })
  defaultCurrency: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'LogoStorageKey' })
  logoStorageKey?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: 'example', description: 'Settings' })
  settings?: any;

}
