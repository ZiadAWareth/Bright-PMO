
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum PortfolioStatus {
  active = 'active',
  on_hold = 'on_hold',
  completed = 'completed',
  archived = 'archived'
}

export enum Priority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  critical = 'critical'
}


export class CreatePortfolioDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'StrategicObjective' })
  strategicObjective?: string;


  @IsEnum(PortfolioStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: PortfolioStatus })
  status: PortfolioStatus;


  @IsEnum(Priority)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Priority', enum: Priority })
  priority: Priority;


  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ example: 'example string', description: 'Tags' })
  tags: string[];


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'BudgetCapacity' })
  budgetCapacity?: string;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ManagerId' })
  managerId: number;

}
