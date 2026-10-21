
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64 } from "class-validator";

export class CreateCalendarExceptionDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'CalendarId' })
  calendarId: number;


  @IsNotEmpty()
  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Date' })
  date: Date;


  @IsNotEmpty()
  @ApiProperty({ example: true, description: 'IsWorking' })
  isWorking: boolean;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Name' })
  name?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
