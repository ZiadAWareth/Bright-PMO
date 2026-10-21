
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  
  export class UpdateBenchmarkDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CategoryId' })
    categoryId?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'CostPerM2' })
    costPerM2?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'DurationPerM2' })
    durationPerM2?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ExpectedRoi' })
    expectedRoi?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'CostOverrunMax' })
    costOverrunMax?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ScheduleSlipMax' })
    scheduleSlipMax?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'CpiThreshold' })
    cpiThreshold?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'SpiThreshold' })
    spiThreshold?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'EfficiencyRatio' })
    efficiencyRatio?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'AvgTaskDelayMax' })
    avgTaskDelayMax?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'CriticalPathDelayMax' })
    criticalPathDelayMax?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'ExpectedTaskCompletionRate' })
    expectedTaskCompletionRate?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'MaxBudgetThresholdViolation' })
    maxBudgetThresholdViolation?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'VelocityStabilityMin' })
    velocityStabilityMin?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'SprintCompletionRateMin' })
    sprintCompletionRateMin?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  