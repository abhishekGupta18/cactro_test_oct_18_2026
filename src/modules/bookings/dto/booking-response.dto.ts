import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { EventResponseDto } from '../../events/dto/event-response.dto';
import { UserResponseDto } from '../../users/dto/user-response.dto';

@Exclude()
export class BookingResponseDto {
  @ApiProperty({ example: 'c3d4e5f6-a7b8-9012-cdef-123456789012' })
  @Expose()
  id: string;

  @ApiProperty({ example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901' })
  @Expose()
  eventId: string;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  @Expose()
  customerId: string;

  @ApiProperty({ example: 2 })
  @Expose()
  seatsCount: number;

  @ApiProperty({ example: 99.98 })
  @Expose()
  totalAmount: number;

  @ApiProperty({ example: 'CONFIRMED' })
  @Expose()
  status: string;

  @ApiProperty({ type: () => EventResponseDto, required: false })
  @Expose()
  @Type(() => EventResponseDto)
  event?: EventResponseDto;

  @ApiProperty({ type: () => UserResponseDto, required: false })
  @Expose()
  @Type(() => UserResponseDto)
  customer?: UserResponseDto;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  @Expose()
  updatedAt: Date;
}
