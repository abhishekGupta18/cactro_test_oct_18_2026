import { ApiProperty } from '@nestjs/swagger';

export class BaseApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  timestamp: string;

  data?: T;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: '2026-10-18T09:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/bookings' })
  path: string;

  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: 'BadRequest' })
  error: string;

  @ApiProperty({ example: 'Insufficient seats available for this event' })
  message: string;
}
