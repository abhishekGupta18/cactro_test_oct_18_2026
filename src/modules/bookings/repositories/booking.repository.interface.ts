import { Booking, Event } from '@prisma/client';

export const BOOKING_REPOSITORY = 'BOOKING_REPOSITORY';

export interface BookingWithDetails extends Booking {
  event: Event;
  customer?: any;
}

export interface IBookingRepository {
  bookTicketsOptimized(
    eventId: string,
    customerId: string,
    seatsCount: number,
  ): Promise<BookingWithDetails>;

  bookTicketsNaive(
    eventId: string,
    customerId: string,
    seatsCount: number,
  ): Promise<BookingWithDetails>;

  findByCustomerId(customerId: string): Promise<BookingWithDetails[]>;
  findById(id: string): Promise<BookingWithDetails | null>;
}
