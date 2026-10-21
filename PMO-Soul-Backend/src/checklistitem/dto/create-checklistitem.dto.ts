
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";

export class CreateChecklistItemDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ChecklistId' })
  checklistId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Label' })
  label: string;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsDone' })
  isDone: boolean;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'DoneAt' })
  doneAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'DoneById' })
  doneById?: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SortOrder' })
  sortOrder: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
