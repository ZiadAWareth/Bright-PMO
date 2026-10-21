
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64 } from "class-validator";
  
  export class UpdateUserDto {
  
      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'FirstName' })
    firstName?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'LastName' })
    lastName?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Email' })
    email?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Password' })
    password?: string;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'RoleId' })
    roleId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'BusinessUnitId' })
    businessUnitId?: number;
  

      @IsOptional()
  @IsNumber({})
    @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
    organizationId?: number;
  
  }
  