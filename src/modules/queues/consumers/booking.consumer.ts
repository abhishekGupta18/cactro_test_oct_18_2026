import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  BOOKING_QUEUE,
  CONFIRMATION_EMAIL_JOB,
} from '../../../common/constants/queue.constants';
import {
  EmailService,
  BookingConfirmationEmailPayload,
} from '../../notifications/email.service';

@Processor(BOOKING_QUEUE)
export class BookingConsumer extends WorkerHost {
  private readonly logger = new Logger(BookingConsumer.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<BookingConfirmationEmailPayload, any, string>): Promise<any> {
    this.logger.log(`Processing job #${job.id} [${job.name}] for booking ${job.data.bookingId}`);

    switch (job.name) {
      case CONFIRMATION_EMAIL_JOB: {
        const result = await this.emailService.sendBookingConfirmation(job.data);
        if (!result.success) {
          throw new Error(`Failed to deliver booking confirmation email to ${job.data.to}`);
        }
        return result;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
