
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  export enum CostType {
  labor = 'labor',
  material = 'material',
  equipment = 'equipment',
  subcontract = 'subcontract',
  overhead = 'overhead',
  other = 'other'
}


  export class UpdateBudgetLineDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WbsNodeId' })
    wbsNodeId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WorkItemId' })
    workItemId?: number;
  

      @IsOptional()
  @IsEnum(CostType)
    @ApiPropertyOptional({ example: 'example string', description: 'CostType', enum: CostType })
    costType?: CostType;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'PlannedAmount' })
    plannedAmount?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ActualAmount' })
    actualAmount?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ThresholdPct' })
    thresholdPct?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'FiscalYear' })
    fiscalYear?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'FiscalPeriod' })
    fiscalPeriod?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  