
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum HandoverStatus {
  scheduled = 'scheduled',
  in_progress = 'in_progress',
  completed = 'completed'
}


export class CreateHandoverDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ProjectId' })
  projectId: number;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'ScheduledAt' })
  scheduledAt: Date;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'ResponsibleId' })
  responsibleId: number;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Recipient' })
  recipient?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'ReceiptDocumentId' })
  receiptDocumentId?: number;


  @IsEnum(HandoverStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: HandoverStatus })
  status: HandoverStatus;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Notes' })
  notes?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'CompletedAt' })
  completedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
