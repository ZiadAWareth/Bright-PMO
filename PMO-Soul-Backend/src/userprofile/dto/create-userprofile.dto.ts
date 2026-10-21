
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsArray, IsBase64, IsEnum } from "class-validator";
export enum UserStatus {
  active = 'active',
  inactive = 'inactive',
  suspended = 'suspended'
}


export class CreateUserProfileDto {

  @IsNumber({})
  @IsNotEmpty()
  @ApiProperty({ example: 1, description: 'UserId' })
  userId: number;


  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Username' })
  username: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'IdpUserId' })
  idpUserId?: string;


  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'example string', description: 'PhoneNumber' })
  phoneNumber?: string;


  @IsEnum(UserStatus)
  @IsNotEmpty()
  @ApiProperty({ example: 'example string', description: 'Status', enum: UserStatus })
  status: UserStatus;


  @IsOptional()
  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z', description: 'LastLoginAt' })
  lastLoginAt?: Date;


  @IsOptional()
  @IsNumber({})
  @ApiPropertyOptional({ example: 1, description: 'OrganizationId' })
  organizationId?: number;

}
