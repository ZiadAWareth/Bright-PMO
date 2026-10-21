
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum StatusCategory {
  todo = 'todo',
  in_progress = 'in_progress',
  done = 'done'
}


export class CreateWorkItemStatusDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsEnum(StatusCategory)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Category', enum: StatusCategory })
  category: StatusCategory;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SortOrder' })
  sortOrder: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'WipLimit' })
  wipLimit?: number;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsDefault' })
  isDefault: boolean;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'ColorToken' })
  colorToken?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ArchivedAt' })
  archivedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
