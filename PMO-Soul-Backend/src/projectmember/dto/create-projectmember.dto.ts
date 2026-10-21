
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum ProjectRole {
  manager = 'manager',
  product_owner = 'product_owner',
  scrum_master = 'scrum_master',
  member = 'member',
  stakeholder = 'stakeholder',
  viewer = 'viewer'
}


export class CreateProjectMemberDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'UserId' })
  userId: number;


  @IsEnum(ProjectRole)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ProjectRole', enum: ProjectRole })
  projectRole: ProjectRole;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Title' })
  title?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Department' })
  department?: string;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsLead' })
  isLead: boolean;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'AllocationPct' })
  allocationPct: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'JoinedAt' })
  joinedAt: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LeftAt' })
  leftAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
