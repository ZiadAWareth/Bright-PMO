
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
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


  export class UpdateProcurementDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProjectId' })
    projectId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'WbsNodeId' })
    wbsNodeId?: number;
  

      @IsOptional()
  @IsEnum(ProcurementType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: ProcurementType })
    type?: ProcurementType;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Description' })
    description?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'EstimatedCost' })
    estimatedCost?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ActualCost' })
    actualCost?: string;
  

      @IsOptional()
  @IsEnum(ProcurementStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: ProcurementStatus })
    status?: ProcurementStatus;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'NeededBy' })
    neededBy?: Date;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  