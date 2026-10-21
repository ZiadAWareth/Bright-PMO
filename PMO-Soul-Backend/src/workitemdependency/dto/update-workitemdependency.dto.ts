
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum DependencyType {
  finish_to_start = 'finish_to_start',
  start_to_start = 'start_to_start',
  finish_to_finish = 'finish_to_finish',
  start_to_finish = 'start_to_finish'
}


  export class UpdateWorkItemDependencyDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'PredecessorId' })
    predecessorId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'SuccessorId' })
    successorId?: number;
  

      @IsOptional()
  @IsEnum(DependencyType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: DependencyType })
    type?: DependencyType;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'LagDays' })
    lagDays?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  