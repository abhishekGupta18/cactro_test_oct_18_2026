import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateEventDto {
  @ApiProperty({
    example: 'Tech Innovators Summit 2026 - Keynote Rescheduled',
    required: false,
    description: 'Updated title of the event',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    example: 'Updated agenda with exciting keynote speakers.',
    required: false,
    description: 'Updated event description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Main Auditorium, Moscone Center, SF',
    required: false,
    description: 'Updated venue location',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: '2026-11-20T11:00:00.000Z',
    required: false,
    description: 'Updated event date/time (ISO 8601 string)',
  })
  @IsDateString({}, { message: 'dateTime must be a valid ISO 8601 date string' })
  @IsOptional()
  dateTime?: string;

  @ApiProperty({
    example: 150,
    required: false,
    description: 'Updated total seat capacity (must not be less than already booked seats)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  totalSeats?: number;

  @ApiProperty({
    example: 59.99,
    required: false,
    description: 'Updated ticket price',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    example: 'The start time has been moved by 1 hour to 11:00 AM due to keynote speaker arrival.',
    required: false,
    description: 'Custom message to be emailed to all customers who booked tickets',
  })
  @IsString()
  @IsOptional()
  updateMessage?: string;
}
