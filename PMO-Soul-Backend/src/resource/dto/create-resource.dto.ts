
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
import { IsNumeric } from "../../shared/validators";
export enum ResourceType {
  labor = 'labor',
  equipment = 'equipment',
  material = 'material'
}

export enum ResourceAvailability {
  available = 'available',
  on_leave = 'on_leave',
  inactive = 'inactive'
}


export class CreateResourceDto {

  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Name' })
  name: string;


  @IsEnum(ResourceType)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Type', enum: ResourceType })
  type: ResourceType;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Role' })
  role?: string;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'UserId' })
  userId?: number;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Department' })
  department?: string;


  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ example: 'example string', description: 'Skills' })
  skills: string[];


  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'Rating' })
  rating: number;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Rate' })
  rate: string;


  @IsNumeric()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'CapacityHoursPerDay' })
  capacityHoursPerDay: string;


  @IsEnum(ResourceAvailability)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Availability', enum: ResourceAvailability })
  availability: ResourceAvailability;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Unit' })
  unit?: string;


  @IsOptional()
  @IsNumeric()
  @ApiPropertyOptional({ example: 'example string', description: 'Quantity' })
  quantity?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Email' })
  email?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'PhoneNumber' })
  phoneNumber?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'Location' })
  location?: string;

}
