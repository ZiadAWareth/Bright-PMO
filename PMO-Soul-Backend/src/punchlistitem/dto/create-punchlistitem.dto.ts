
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum PunchItemStatus {
  open = 'open',
  in_progress = 'in_progress',
  resolved = 'resolved'
}


export class CreatePunchListItemDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Title' })
  title: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Location' })
  location?: string;


  @IsEnum(PunchItemStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: PunchItemStatus })
  status: PunchItemStatus;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'AssigneeId' })
  assigneeId?: number;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'DueOn' })
  dueOn?: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ResolvedAt' })
  resolvedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
