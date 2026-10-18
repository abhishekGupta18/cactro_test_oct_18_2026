import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  BOOKING_REPOSITORY,
  IBookingRepository,
} from '../repositories/booking.repository.interface';
import { CreateBookingDto, BookingMode } from '../dto/create-booking.dto';
import { BookingResponseDto } from '../dto/booking-response.dto';
import { QueueProducer } from '../../queues/producers/queue.producer';
import { plainToInstance } from 'class-transformer';
import { Role } from '../../../common/constants/roles.enum';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @Inject(BOOKING_REPOSITORY)
    private readonly bookingRepository: IBookingRepository,
    private readonly queueProducer: QueueProducer,
  ) {}

  async createBooking(
    customerId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    const { eventId, seatsCount, mode } = createBookingDto;

    const booking =
      mode === BookingMode.NAIVE
        ? await this.bookingRepository.bookTicketsNaive(
            eventId,
            customerId,
            seatsCount,
          )
        : await this.bookingRepository.bookTicketsOptimized(
            eventId,
            customerId,
            seatsCount,
          );

    // Trigger Background Task 1: Booking Confirmation Email via BullMQ queue
    this.enqueueConfirmationEmail(booking);

    return plainToInstance(BookingResponseDto, booking);
  }

  private async enqueueConfirmationEmail(booking: any): Promise<void> {
    try {
      const customerEmail = booking.customer?.email;
      const customerName = booking.customer?.name || 'Valued Customer';

      if (customerEmail) {
        await this.queueProducer.enqueueBookingConfirmation({
          to: customerEmail,
          customerName,
          bookingId: booking.id,
          eventTitle: booking.event.title,
          eventLocation: booking.event.location,
          eventDateTime: booking.event.dateTime,
          seatsCount: booking.seatsCount,
          totalAmount: booking.totalAmount,
        });
        this.logger.log(
          `Enqueued Task 1 booking confirmation email for booking: ${booking.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to enqueue booking confirmation email for booking ${booking.id}`,
        error,
      );
    }
  }

  async getMyBookings(customerId: string): Promise<BookingResponseDto[]> {
    const bookings = await this.bookingRepository.findByCustomerId(customerId);
    return bookings.map((b) => plainToInstance(BookingResponseDto, b));
  }

  async getBookingById(
    id: string,
    userId: string,
    role: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundException(`Booking with ID '${id}' not found`);
    }

    // Role-based access check: customer can only see own booking; organizer can see bookings for their event
    const isOwner = booking.customerId === userId;
    const isEventOrganizer =
      role === Role.ORGANIZER && booking.event.organizerId === userId;

    if (!isOwner && !isEventOrganizer) {
      throw new ForbiddenException(
        'You do not have permission to view this booking',
      );
    }

    return plainToInstance(BookingResponseDto, booking);
  }
}
