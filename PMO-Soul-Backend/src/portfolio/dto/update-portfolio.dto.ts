
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
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


  export class UpdatePortfolioDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'StrategicObjective' })
    strategicObjective?: string;
  

      @IsOptional()
  @IsEnum(PortfolioStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: PortfolioStatus })
    status?: PortfolioStatus;
  

      @IsOptional()
  @IsEnum(Priority)
    @ApiPropertyOptional({ example: 'example string', description: 'Priority', enum: Priority })
    priority?: Priority;
  

      @IsOptional()
  @IsArray()
  @IsString({ each: true })
    @ApiPropertyOptional({ example: 'example string', description: 'Tags' })
    tags?: string[];
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'BudgetCapacity' })
    budgetCapacity?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ManagerId' })
    managerId?: number;
  
  }
  