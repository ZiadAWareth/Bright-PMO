
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";

export class CreateLifecycleTemplateStepDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'TemplateId' })
  templateId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Key' })
  key: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Title' })
  title: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SortOrder' })
  sortOrder: number;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsRequired' })
  isRequired: boolean;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
