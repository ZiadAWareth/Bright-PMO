
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";
import { IsNumeric } from "../../shared/validators";

export class CreateWorkCalendarDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsArray()
  @IsNumber({}, { each: true })
  @ApiProperty({ example: 1, description: 'WorkingWeekdays' })
  workingWeekdays: number[];


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'HoursPerDay' })
  hoursPerDay: string;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsDefault' })
  isDefault: boolean;

}
