import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Exclude()
export class EventResponseDto {
  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'Tech Innovators Summit 2026' })
  @Expose()
  title: string;

  @ApiProperty({ example: 'A premier conference on AI and cloud computing.' })
  @Expose()
  description: string;

  @ApiProperty({ example: 'Moscone Center, San Francisco, CA' })
  @Expose()
  location: string;

  @ApiProperty({ example: '2026-11-20T10:00:00.000Z' })
  @Expose()
  dateTime: Date;

  @ApiProperty({ example: 100 })
  @Expose()
  totalSeats: number;

  @ApiProperty({ example: 85 })
  @Expose()
  availableSeats: number;

  @ApiProperty({ example: 49.99 })
  @Expose()
  price: number;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  organizerId: string;

  @ApiProperty({ type: () => UserResponseDto, required: false })
  @Expose()
  @Type(() => UserResponseDto)
  organizer?: UserResponseDto;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
