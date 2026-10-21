
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

export enum TransactionSource {
  manual = 'manual',
  finance_sync = 'finance_sync',
  timesheet = 'timesheet',
  procurement = 'procurement'
}


export class CreateCostTransactionDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'BudgetLineId' })
  budgetLineId?: number;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Amount' })
  amount: string;


  @IsEnum(CostType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'CostType', enum: CostType })
  costType: CostType;


  @IsEnum(TransactionSource)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Source', enum: TransactionSource })
  source: TransactionSource;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'ExternalRef' })
  externalRef?: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'OccurredOn' })
  occurredOn: Date;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
