
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";

export class CreateSavedReportDto {

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsNotEmpty()
  @ApiProperty({ example: 'example', description: 'Definition' })
  definition: any;


  @IsNotEmpty()
  @ApiProperty({ example: 'example', description: 'AllowedRoleIds' })
  allowedRoleIds: any;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsActive' })
  isActive: boolean;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'CreatedById' })
  createdById?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
