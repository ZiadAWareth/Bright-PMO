
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum WorkItemLinkType {
  blocks = 'blocks',
  relates_to = 'relates_to',
  duplicates = 'duplicates'
}


  export class UpdateWorkItemLinkDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SourceId' })
    sourceId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'TargetId' })
    targetId?: number;
  

      @IsOptional()
  @IsEnum(WorkItemLinkType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: WorkItemLinkType })
    type?: WorkItemLinkType;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  