import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/constants/roles.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User unique email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 6, description: 'User password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Full name of the user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: Role,
    example: Role.CUSTOMER,
    description: 'Role of the user (ORGANIZER or CUSTOMER)',
  })
  @IsEnum(Role, { message: 'Role must be either ORGANIZER or CUSTOMER' })
  @IsNotEmpty()
  role: Role;
}
