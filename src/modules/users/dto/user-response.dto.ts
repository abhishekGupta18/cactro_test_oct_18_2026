import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Role } from '../../../common/constants/roles.enum';

@Exclude()
export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  @Expose()
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Expose()
  name: string;

  @ApiProperty({ enum: Role, example: Role.CUSTOMER })
  @Expose()
  role: Role;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  @Expose()
  updatedAt: Date;

  constructor(partial: Partial<UserResponseDto>) {
    Object.assign(this, partial);
  }
}
