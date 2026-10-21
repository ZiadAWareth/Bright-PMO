
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsObject } from "class-validator";

export class UpdateRolesAndPermissionsDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: "Admin", description: "Role name" })
  role?: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({ 
    example: { "user": { "get": true, "getAll": true, "create": true, "update": true, "delete": true } },
    description: "Entity permissions object",
    type: Object
  })
  entityPermissions?: Record<string, any>;
}
