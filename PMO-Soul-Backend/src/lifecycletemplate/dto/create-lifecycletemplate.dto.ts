
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum Methodology {
  waterfall = 'waterfall',
  agile = 'agile',
  hybrid = 'hybrid'
}

export enum LifecycleGating {
  sequential = 'sequential',
  free = 'free'
}


export class CreateLifecycleTemplateDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsEnum(Methodology)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Methodology', enum: Methodology })
  methodology: Methodology;


  @IsEnum(LifecycleGating)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Gating', enum: LifecycleGating })
  gating: LifecycleGating;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsDefault' })
  isDefault: boolean;

}
