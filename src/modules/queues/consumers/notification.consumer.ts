import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  NOTIFICATION_QUEUE,
  EVENT_UPDATE_EMAIL_JOB,
} from '../../../common/constants/queue.constants';
import {
  EmailService,
  EventUpdateEmailPayload,
} from '../../notifications/email.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationConsumer extends WorkerHost {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EventUpdateEmailPayload, any, string>): Promise<any> {
    this.logger.log(`Processing job #${job.id} [${job.name}] for customer ${job.data.to}`);

    switch (job.name) {
      case EVENT_UPDATE_EMAIL_JOB: {
        const result = await this.emailService.sendEventUpdateNotification(job.data);
        if (!result.success) {
          throw new Error(`Failed to deliver event update notification email to ${job.data.to}`);
        }
        return result;
      }
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }
}
