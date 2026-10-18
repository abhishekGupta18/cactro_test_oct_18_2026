import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export enum BookingMode {
  OPTIMIZED = 'optimized',
  NAIVE = 'naive',
}

export class CreateBookingDto {
  @ApiProperty({
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    description: 'UUID of the event to book tickets for',
  })
  @IsUUID('4', { message: 'eventId must be a valid UUID v4' })
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({
    example: 1,
    minimum: 1,
    default: 1,
    description: 'Number of seats to book in this transaction',
  })
  @Type(() => Number)
  @IsInt({ message: 'seatsCount must be an integer' })
  @Min(1, { message: 'Must book at least 1 seat' })
  seatsCount: number = 1;

  @ApiPropertyOptional({
    enum: BookingMode,
    default: BookingMode.OPTIMIZED,
    description:
      'Execution mode: "optimized" (atomic locking, prevents overselling) vs "naive" (simulates race condition vulnerability for stress test comparison)',
  })
  @IsEnum(BookingMode)
  @IsOptional()
  mode?: BookingMode = BookingMode.OPTIMIZED;
}
