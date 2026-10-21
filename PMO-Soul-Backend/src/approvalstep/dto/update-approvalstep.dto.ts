
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
  export enum ApprovalStatus {
  waiting = 'waiting',
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
  revision_requested = 'revision_requested',
  cancelled = 'cancelled'
}


  export class UpdateApprovalStepDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'RequestId' })
    requestId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'StepOrder' })
    stepOrder?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'AssigneeId' })
    assigneeId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'ApproverRoleId' })
    approverRoleId?: number;
  

      @IsOptional()
  @IsEnum(ApprovalStatus)
    @ApiPropertyOptional({ example: 'example string', description: 'Status', enum: ApprovalStatus })
    status?: ApprovalStatus;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'DecidedById' })
    decidedById?: number;
  

      @IsOptional()
    @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'DecidedAt' })
    decidedAt?: Date;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Comments' })
    comments?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  