
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum IntegrationProvider {
  idp = 'idp',
  hr = 'hr',
  inventory = 'inventory',
  finance = 'finance',
  metabase = 'metabase'
}


export class CreateIntegrationConnectionDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsEnum(IntegrationProvider)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Provider', enum: IntegrationProvider })
  provider: IntegrationProvider;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'BaseUrl' })
  baseUrl?: string;


  @IsNotEmpty()
  @ApiProperty({ example: 'example', description: 'Config' })
  config: any;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsEnabled' })
  isEnabled: boolean;

}
