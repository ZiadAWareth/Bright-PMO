import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class CreateWorkflowDto {
  @ApiProperty({ example: 'Order Approval' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Sends approval email for high-value orders' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'cuid-of-entity' })
  @IsNotEmpty()
  @IsString()
  entityId: string;

  @ApiProperty({ example: 'Order' })
  @IsNotEmpty()
  @IsString()
  entityName: string;

  @ApiProperty({
    example: {
      nodes: [
        { id: 't1', kind: 'trigger', type: 'onCreate', config: { entityId: 'order-id' } },
      ],
      edges: [],
    },
  })
  @IsNotEmpty()
  @IsObject()
  definition: Record<string, any>;
}
