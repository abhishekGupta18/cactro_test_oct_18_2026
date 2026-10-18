import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IBookingRepository,
  BookingWithDetails,
} from './booking.repository.interface';
import { Event } from '@prisma/client';

@Injectable()
export class BookingRepository implements IBookingRepository {
  private readonly logger = new Logger(BookingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * OPTIMIZED BOOKING IMPLEMENTATION:
   * Uses ACID database transaction with PostgreSQL row-level locking (SELECT ... FOR UPDATE).
   * This completely prevents race conditions, overselling, and lost updates under high concurrency.
   */
  async bookTicketsOptimized(
    eventId: string,
    customerId: string,
    seatsCount: number,
  ): Promise<BookingWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Acquire pessimistic lock on the event row
      const events: Event[] = await tx.$queryRaw`
        SELECT * FROM events WHERE id = ${eventId} FOR UPDATE
      `;

      if (!events || events.length === 0) {
        throw new NotFoundException(`Event with ID '${eventId}' not found`);
      }

      const event = events[0];

      // 2. Strict capacity validation inside the locked transaction
      if (event.availableSeats < seatsCount) {
        throw new BadRequestException(
          `Insufficient seats available. Requested: ${seatsCount}, Available: ${event.availableSeats}`,
        );
      }

      // 3. Atomic decrement of available seats
      const updatedEvent = await tx.event.update({
        where: { id: eventId },
        data: {
          availableSeats: {
            decrement: seatsCount,
          },
        },
      });

      const totalAmount = event.price * seatsCount;

      // 4. Create confirmed booking record
      const booking = await tx.booking.create({
        data: {
          eventId,
          customerId,
          seatsCount,
          totalAmount,
          status: 'CONFIRMED',
        },
        include: {
          event: true,
          customer: true,
        },
      });

      return booking as BookingWithDetails;
    });
  }

  /**
   * NAIVE BOOKING IMPLEMENTATION:
   * Demonstrates the initial naive implementation that breaks under concurrent stress.
   * Checks available seats without a lock, then calculates and updates seats using stale data.
   * Under concurrent load, multiple requests read the same seat count, leading to overselling.
   */
  async bookTicketsNaive(
    eventId: string,
    customerId: string,
    seatsCount: number,
  ): Promise<BookingWithDetails> {
    // 1. Read event without lock (vulnerable to race conditions)
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    if (event.availableSeats < seatsCount) {
      throw new BadRequestException(
        `Insufficient seats available. Requested: ${seatsCount}, Available: ${event.availableSeats}`,
      );
    }

    // Small delay simulating non-atomic processing window
    await new Promise((resolve) => setTimeout(resolve, 25));

    // 2. Non-atomic overwrite with stale data
    const newAvailable = event.availableSeats - seatsCount;
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        availableSeats: newAvailable,
      },
    });

    const totalAmount = event.price * seatsCount;

    // 3. Create booking
    const booking = await this.prisma.booking.create({
      data: {
        eventId,
        customerId,
        seatsCount,
        totalAmount,
        status: 'CONFIRMED',
      },
      include: {
        event: true,
        customer: true,
      },
    });

    return booking as BookingWithDetails;
  }

  async findByCustomerId(customerId: string): Promise<BookingWithDetails[]> {
    const bookings = await this.prisma.booking.findMany({
      where: { customerId },
      include: {
        event: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings as BookingWithDetails[];
  }

  async findById(id: string): Promise<BookingWithDetails | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        customer: true,
      },
    });

    return booking as BookingWithDetails | null;
  }
}
