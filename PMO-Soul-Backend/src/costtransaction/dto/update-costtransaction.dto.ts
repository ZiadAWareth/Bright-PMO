
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

export enum TransactionSource {
  manual = 'manual',
  finance_sync = 'finance_sync',
  timesheet = 'timesheet',
  procurement = 'procurement'
}


  export class UpdateCostTransactionDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'BudgetLineId' })
    budgetLineId?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'Amount' })
    amount?: string;
  

      @IsOptional()
  @IsEnum(CostType)
    @ApiPropertyOptional({ example: 'example string', description: 'CostType', enum: CostType })
    costType?: CostType;
  

      @IsOptional()
  @IsEnum(TransactionSource)
    @ApiPropertyOptional({ example: 'example string', description: 'Source', enum: TransactionSource })
    source?: TransactionSource;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'ExternalRef' })
    externalRef?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'OccurredOn' })
    occurredOn?: Date;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  