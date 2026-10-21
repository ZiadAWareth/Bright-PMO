
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum EscalationStatus {
  open = 'open',
  acknowledged = 'acknowledged',
  resolved = 'resolved'
}


export class CreateEscalationDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'WorkItemId' })
  workItemId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'EscalatedTo' })
  escalatedTo: string;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Reason' })
  reason: string;


  @IsEnum(EscalationStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: EscalationStatus })
  status: EscalationStatus;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'TriggeredAt' })
  triggeredAt: Date;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'ResolvedAt' })
  resolvedAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
