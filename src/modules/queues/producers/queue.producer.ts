import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BOOKING_QUEUE,
  NOTIFICATION_QUEUE,
  CONFIRMATION_EMAIL_JOB,
  EVENT_UPDATE_EMAIL_JOB,
} from '../../../common/constants/queue.constants';
import {
  BookingConfirmationEmailPayload,
  EventUpdateEmailPayload,
} from '../../notifications/email.service';

@Injectable()
export class QueueProducer {
  private readonly logger = new Logger(QueueProducer.name);

  constructor(
    @InjectQueue(BOOKING_QUEUE) private readonly bookingQueue: Queue,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  async enqueueBookingConfirmation(payload: BookingConfirmationEmailPayload) {
    try {
      const job = await this.bookingQueue.add(
        CONFIRMATION_EMAIL_JOB,
        payload,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(
        `Enqueued booking confirmation job #${job.id} for booking: ${payload.bookingId}`,
      );
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to enqueue booking confirmation job for booking ${payload.bookingId}`,
        error,
      );
    }
  }

  async enqueueEventUpdateNotification(payload: EventUpdateEmailPayload) {
    try {
      const job = await this.notificationQueue.add(
        EVENT_UPDATE_EMAIL_JOB,
        payload,
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(
        `Enqueued event update notification job #${job.id} for: ${payload.to}`,
      );
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to enqueue event update notification for ${payload.to}`,
        error,
      );
    }
  }
}
