
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  export enum RfqResponseStatus {
  submitted = 'submitted',
  under_review = 'under_review',
  shortlisted = 'shortlisted',
  awarded = 'awarded',
  rejected = 'rejected'
}


  export class UpdateRfqResponseDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ProcurementId' })
    procurementId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'VendorId' })
    vendorId?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'QuoteAmount' })
    quoteAmount?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'DeliveryDays' })
    deliveryDays?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'TechnicalScore' })
    technicalScore?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CommercialScore' })
    commercialScore?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'TotalScore' })
    totalScore?: number;
  

      @IsOptional()
  @IsEnum(RfqResponseStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: RfqResponseStatus })
    status?: RfqResponseStatus;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'SubmittedAt' })
    submittedAt?: Date;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
    notes?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  