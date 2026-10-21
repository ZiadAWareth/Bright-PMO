
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum DependencyType {
  finish_to_start = 'finish_to_start',
  start_to_start = 'start_to_start',
  finish_to_finish = 'finish_to_finish',
  start_to_finish = 'start_to_finish'
}


export class CreateWorkItemDependencyDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'PredecessorId' })
  predecessorId: number;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'SuccessorId' })
  successorId: number;


  @IsEnum(DependencyType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: DependencyType })
  type: DependencyType;


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'LagDays' })
  lagDays: number;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
