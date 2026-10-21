
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum ApprovalType {
  project_creation = 'project_creation',
  budget_change = 'budget_change',
  schedule_change = 'schedule_change',
  scope_change = 'scope_change',
  phase_gate = 'phase_gate',
  checklist = 'checklist',
  project_closure = 'project_closure'
}


export class CreateApprovalPolicyDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsEnum(ApprovalType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: ApprovalType })
  type: ApprovalType;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsActive' })
  isActive: boolean;

}
