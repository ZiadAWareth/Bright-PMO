
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";
  
  export class UpdateWorkCalendarDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
    @ApiPropertyOptional({ example: 1, description: 'WorkingWeekdays' })
    workingWeekdays?: number[];
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'HoursPerDay' })
    hoursPerDay?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsDefault' })
    isDefault?: boolean;
  
  }
  