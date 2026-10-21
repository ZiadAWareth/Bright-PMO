
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum CostType {
  labor = 'labor',
  material = 'material',
  equipment = 'equipment',
  subcontract = 'subcontract',
  overhead = 'overhead',
  other = 'other'
}


export class CreateBudgetLineDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'WbsNodeId' })
  wbsNodeId?: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'WorkItemId' })
  workItemId?: number;


  @IsEnum(CostType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'CostType', enum: CostType })
  costType: CostType;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'PlannedAmount' })
  plannedAmount: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ActualAmount' })
  actualAmount: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ThresholdPct' })
  thresholdPct: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'FiscalYear' })
  fiscalYear: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'FiscalPeriod' })
  fiscalPeriod: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
