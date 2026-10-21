
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum InspectionStatus {
  scheduled = 'scheduled',
  in_progress = 'in_progress',
  passed = 'passed',
  failed = 'failed'
}


export class CreateInspectionDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Kind' })
  kind: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'ScheduledAt' })
  scheduledAt: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'InspectorId' })
  inspectorId?: number;


  @IsEnum(InspectionStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: InspectionStatus })
  status: InspectionStatus;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
  notes?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
  completedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
