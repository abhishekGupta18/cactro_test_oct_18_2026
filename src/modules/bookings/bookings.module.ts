import { Module } from '@nestjs/common';
import { BookingsController } from './controllers/bookings.controller';
import { BookingsService } from './services/bookings.service';
import { BookingRepository } from './repositories/booking.repository';
import { BOOKING_REPOSITORY } from './repositories/booking.repository.interface';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [BookingsController],
  providers: [
    BookingsService,
    {
      provide: BOOKING_REPOSITORY,
      useClass: BookingRepository,
    },
  ],
  exports: [BookingsService, BOOKING_REPOSITORY],
})
export class BookingsModule {}
