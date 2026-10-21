
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum ProcurementType {
  material = 'material',
  service = 'service',
  equipment = 'equipment'
}

export enum ProcurementStatus {
  planned = 'planned',
  rfq_open = 'rfq_open',
  evaluating = 'evaluating',
  awarded = 'awarded',
  ordered = 'ordered',
  delivered = 'delivered',
  closed = 'closed',
  cancelled = 'cancelled'
}


export class CreateProcurementDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'WbsNodeId' })
  wbsNodeId?: number;


  @IsEnum(ProcurementType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: ProcurementType })
  type: ProcurementType;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Description' })
  description: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'EstimatedCost' })
  estimatedCost: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'ActualCost' })
  actualCost: string;


  @IsEnum(ProcurementStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: ProcurementStatus })
  status: ProcurementStatus;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'NeededBy' })
  neededBy?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
