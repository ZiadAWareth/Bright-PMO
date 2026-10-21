
  import { ApiProperty } from "@nestjs/swagger";
  import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto{
    @ApiProperty({example:'test@gmail.com',description:'Email of the user'})
    @IsEmail()
    @IsNotEmpty()
    email:string;

    @ApiProperty({example:'Password@123',description:'Password of the user'})
    @IsString()
    @IsNotEmpty()
    password:string;
}
