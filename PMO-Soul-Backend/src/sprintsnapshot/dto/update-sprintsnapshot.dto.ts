
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  
  export class UpdateSprintSnapshotDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SprintId' })
    sprintId?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'Date' })
    date?: Date;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ScopePoints' })
    scopePoints?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'CompletedPoints' })
    completedPoints?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ScopeHours' })
    scopeHours?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'RemainingHours' })
    remainingHours?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ItemCount' })
    itemCount?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'DoneCount' })
    doneCount?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  