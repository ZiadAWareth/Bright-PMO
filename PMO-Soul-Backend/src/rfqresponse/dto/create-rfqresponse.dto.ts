
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum RfqResponseStatus {
  submitted = 'submitted',
  under_review = 'under_review',
  shortlisted = 'shortlisted',
  awarded = 'awarded',
  rejected = 'rejected'
}


export class CreateRfqResponseDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProcurementId' })
  procurementId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'VendorId' })
  vendorId: number;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'QuoteAmount' })
  quoteAmount: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'DeliveryDays' })
  deliveryDays?: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'TechnicalScore' })
  technicalScore: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'CommercialScore' })
  commercialScore: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'TotalScore' })
  totalScore: number;


  @IsEnum(RfqResponseStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: RfqResponseStatus })
  status: RfqResponseStatus;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'SubmittedAt' })
  submittedAt: Date;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
  notes?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
