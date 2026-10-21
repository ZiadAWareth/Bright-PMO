
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum InboxStatus {
  received = 'received',
  processing = 'processing',
  processed = 'processed',
  failed = 'failed'
}


export class CreateIdpInboxEventDto {

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'IdempotencyKey' })
  idempotencyKey: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Event' })
  event: string;


  @IsNotEmpty()
  @ApiProperty({ example: 'example', description: 'Payload' })
  payload: any;


  @IsEnum(InboxStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: InboxStatus })
  status: InboxStatus;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'LastError' })
  lastError?: string;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ProcessedAt' })
  processedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
