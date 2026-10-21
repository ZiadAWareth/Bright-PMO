
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum InboxStatus {
  received = 'received',
  processing = 'processing',
  processed = 'processed',
  failed = 'failed'
}


  export class UpdateIdpInboxEventDto {
  
      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'IdempotencyKey' })
    idempotencyKey?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Event' })
    event?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: 'example', description: 'Payload', type: Object })
    payload?: any;
  

      @IsOptional()
  @IsEnum(InboxStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: InboxStatus })
    status?: InboxStatus;
  

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
  