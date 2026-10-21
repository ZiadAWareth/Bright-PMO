
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsObject } from "class-validator";

export class CreateRolesAndPermissionsDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: "Admin", description: "Role name" })
  role: string;

  @IsObject()
  @IsNotEmpty()
  @ApiProperty({ 
    example: { "user": { "get": true, "getAll": true, "create": true, "update": true, "delete": true } },
    description: "Entity permissions object",
    type: Object
  })
  entityPermissions: Record<string, any>;
}
