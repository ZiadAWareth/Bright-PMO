
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
    @ApiProperty({ example: 1, description: 'User ID' })
    id: number;

    @ApiProperty({ example: 'John', description: 'First name' })
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'Last name' })
    lastName: string;

    @ApiProperty({ example: 'john.doe@example.com', description: 'Email address' })
    email: string;


    @ApiProperty({ example: '2024-12-04T08:00:00Z', description: 'Date when account was created' })
    createdAt: Date;

    @ApiProperty({ example: '2024-12-04T08:00:00Z', description: 'Date when account was last updated' })
    updatedAt: Date;
}


export class LoginResponseDto {
    @ApiProperty({ 
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
        description: 'JWT access token for authentication' 
    })
    accessToken: string;


    @ApiProperty({ type: UserResponseDto, description: 'User information' })
    user: UserResponseDto;
}


export class LogoutResponseDto {
    @ApiProperty({ 
        example: 'Logged out successfully', 
        description: 'Success message' 
    })
    message: string;
}


