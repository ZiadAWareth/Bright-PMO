
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  export enum ProjectRole {
  manager = 'manager',
  product_owner = 'product_owner',
  scrum_master = 'scrum_master',
  member = 'member',
  stakeholder = 'stakeholder',
  viewer = 'viewer'
}


  export class UpdateProjectMemberDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'UserId' })
    userId?: number;
  

      @IsOptional()
  @IsEnum(ProjectRole)
    @ApiPropertyOptional({ example: 'example string', description: 'ProjectRole', enum: ProjectRole })
    projectRole?: ProjectRole;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Title' })
    title?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Department' })
    department?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsLead' })
    isLead?: boolean;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'AllocationPct' })
    allocationPct?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'JoinedAt' })
    joinedAt?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LeftAt' })
    leftAt?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  