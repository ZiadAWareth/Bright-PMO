
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum WorkItemLinkType {
  blocks = 'blocks',
  relates_to = 'relates_to',
  duplicates = 'duplicates'
}


export class CreateWorkItemLinkDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SourceId' })
  sourceId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'TargetId' })
  targetId: number;


  @IsEnum(WorkItemLinkType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: WorkItemLinkType })
  type: WorkItemLinkType;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
