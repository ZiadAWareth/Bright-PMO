
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum ApprovalType {
  project_creation = 'project_creation',
  budget_change = 'budget_change',
  schedule_change = 'schedule_change',
  scope_change = 'scope_change',
  phase_gate = 'phase_gate',
  checklist = 'checklist',
  project_closure = 'project_closure'
}


  export class UpdateApprovalPolicyDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsEnum(ApprovalType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: ApprovalType })
    type?: ApprovalType;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsActive' })
    isActive?: boolean;
  
  }
  