
  import { ApiPropertyOptional } from "@nestjs/swagger";
  import { IsString, IsOptional, IsNumber, IsBoolean, IsObject, IsArray, IsBase64 } from "class-validator";
  
  export class UpdateOrganizationDto {
  
      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Name' })
    name?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'Slug' })
    slug?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'PrimaryColor' })
    primaryColor?: string;
  

      @IsOptional()
  @IsString()
    @ApiPropertyOptional({ example: 'example string', description: 'SecondaryColor' })
    secondaryColor?: string;
  

      @IsOptional()
    @ApiPropertyOptional({ example: true, description: 'IsActive' })
    isActive?: boolean;
  
  }
  