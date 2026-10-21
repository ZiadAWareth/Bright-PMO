
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum TimesheetStatus {
  draft = 'draft',
  submitted = 'submitted',
  approved = 'approved',
  rejected = 'rejected'
}


export class CreateTimesheetDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'UserId' })
  userId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'PeriodStart' })
  periodStart: Date;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'PeriodEnd' })
  periodEnd: Date;


  @IsEnum(TimesheetStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: TimesheetStatus })
  status: TimesheetStatus;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'TotalHours' })
  totalHours: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Comments' })
  comments?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'SubmittedAt' })
  submittedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'ApprovedById' })
  approvedById?: number;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'DecidedAt' })
  decidedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
