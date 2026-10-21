
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum LifecycleGating {
  sequential = 'sequential',
  free = 'free'
}

export enum LifecycleStepStatus {
  locked = 'locked',
  available = 'available',
  in_progress = 'in_progress',
  completed = 'completed',
  skipped = 'skipped'
}


export class CreateProjectLifecycleStepDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Key' })
  key: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Title' })
  title: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SortOrder' })
  sortOrder: number;


  @IsEnum(LifecycleGating)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Gating', enum: LifecycleGating })
  gating: LifecycleGating;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsRequired' })
  isRequired: boolean;


  @IsEnum(LifecycleStepStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: LifecycleStepStatus })
  status: LifecycleStepStatus;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
  completedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'CompletedById' })
  completedById?: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
