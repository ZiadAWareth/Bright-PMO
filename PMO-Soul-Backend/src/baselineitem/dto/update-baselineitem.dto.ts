
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  
  export class UpdateBaselineItemDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'BaselineId' })
    baselineId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WorkItemId' })
    workItemId?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
    startDate?: Date;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'EndDate' })
    endDate?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'DurationDays' })
    durationDays?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'PlannedCost' })
    plannedCost?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'PlannedHours' })
    plannedHours?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  