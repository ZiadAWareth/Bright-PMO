
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum ContractStatus {
  draft = 'draft',
  active = 'active',
  completed = 'completed',
  terminated = 'terminated',
  expired = 'expired'
}


export class CreateContractDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProcurementId' })
  procurementId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'VendorId' })
  vendorId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ContractNumber' })
  contractNumber: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Description' })
  description?: string;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'StartDate' })
  startDate: Date;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'EndDate' })
  endDate: Date;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Value' })
  value: string;


  @IsEnum(ContractStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: ContractStatus })
  status: ContractStatus;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
