import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BookingsService } from '../services/bookings.service';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/roles.enum';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Book tickets for an event (Customers only)',
    description:
      'Creates a booking and atomically updates seat count. Dispatches Task 1 booking confirmation email asynchronously via BullMQ. Supports "optimized" (default) or "naive" mode for concurrency testing.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Booking confirmed and confirmation email dispatched',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Insufficient seats available',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden: only CUSTOMER role can book tickets',
  })
  async createBooking(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.createBooking(user.id, createBookingDto);
  }

  @Get('my-bookings')
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all bookings made by the logged-in customer',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of bookings',
    type: [BookingResponseDto],
  })
  async getMyBookings(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingResponseDto[]> {
    return this.bookingsService.getMyBookings(user.id);
  }

  @Get(':id')
  @Roles(Role.CUSTOMER, Role.ORGANIZER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get booking details by ID',
    description:
      'Accessible by the customer who made the booking or the organizer who owns the event.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking details',
    type: BookingResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden: not authorized to view this booking',
  })
  async getBookingById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BookingResponseDto> {
    return this.bookingsService.getBookingById(id, user.id, user.role);
  }
}
