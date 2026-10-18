import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/constants/roles.enum';

export class RegisterDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    minLength: 6,
    description: 'Password (min 6 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Full name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: Role,
    example: Role.CUSTOMER,
    description: 'Role: ORGANIZER or CUSTOMER',
  })
  @IsEnum(Role, { message: 'Role must be either ORGANIZER or CUSTOMER' })
  @IsNotEmpty()
  role: Role;
}
