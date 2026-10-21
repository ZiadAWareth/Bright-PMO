
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64, IsEnum } from "class-validator";
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


  export class UpdateResourceDto {
  
      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsEnum(ResourceType)
    @ApiPropertyOptional({ example: 'example string', description: 'Type', enum: ResourceType })
    type?: ResourceType;
  

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
  

      @IsOptional()
  @IsArray()
  @IsString({ each: true })
    @ApiPropertyOptional({ example: 'example string', description: 'Skills' })
    skills?: string[];
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'Rating' })
    rating?: number;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'Rate' })
    rate?: string;
  

      @IsOptional()
  @IsNumeric()
    @ApiPropertyOptional({ example: 'example string', description: 'CapacityHoursPerDay' })
    capacityHoursPerDay?: string;
  

      @IsOptional()
  @IsEnum(ResourceAvailability)
    @ApiPropertyOptional({ example: 'example string', description: 'Availability', enum: ResourceAvailability })
    availability?: ResourceAvailability;
  

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
  