
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum ClosureStatus {
  in_progress = 'in_progress',
  pending_approval = 'pending_approval',
  approved = 'approved'
}


export class CreateProjectClosureDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsEnum(ClosureStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: ClosureStatus })
  status: ClosureStatus;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'StartedAt' })
  startedAt: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ApprovedAt' })
  approvedAt?: Date;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'FinalNotes' })
  finalNotes?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
