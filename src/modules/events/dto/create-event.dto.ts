import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
  @ApiProperty({
    example: 'Tech Innovators Summit 2026',
    description: 'Title of the event',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'A premier conference on AI, cloud computing, and next-gen tech.',
    required: false,
    description: 'Detailed description of the event',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Moscone Center, San Francisco, CA',
    description: 'Event location or venue',
  })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: '2026-11-20T10:00:00.000Z',
    description: 'Event date and time (ISO 8601 string)',
  })
  @IsDateString({}, { message: 'dateTime must be a valid ISO 8601 date string' })
  @IsNotEmpty()
  dateTime: string;

  @ApiProperty({
    example: 100,
    minimum: 1,
    description: 'Total number of seats available for booking',
  })
  @Type(() => Number)
  @IsInt({ message: 'totalSeats must be an integer' })
  @Min(1, { message: 'totalSeats must be at least 1' })
  totalSeats: number;

  @ApiProperty({
    example: 49.99,
    minimum: 0,
    required: false,
    description: 'Ticket price in USD',
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a valid number' })
  @Min(0, { message: 'price cannot be negative' })
  @IsOptional()
  price?: number = 0;
}
