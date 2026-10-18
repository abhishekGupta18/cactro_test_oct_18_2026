import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  BOOKING_QUEUE,
  NOTIFICATION_QUEUE,
} from '../../common/constants/queue.constants';
import { QueueProducer } from './producers/queue.producer';
import { BookingConsumer } from './consumers/booking.consumer';
import { NotificationConsumer } from './consumers/notification.consumer';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = Number(config.get<number>('REDIS_PORT', 6379));
        const password = config.get<string>('REDIS_PASSWORD');
        const isTls = config.get<string>('REDIS_TLS') === 'true';

        return {
          connection: {
            host,
            port,
            password: password ? password : undefined,
            tls: isTls ? {} : undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: BOOKING_QUEUE },
      { name: NOTIFICATION_QUEUE },
    ),
    NotificationsModule,
  ],
  providers: [QueueProducer, BookingConsumer, NotificationConsumer],
  exports: [QueueProducer],
})
export class QueuesModule {}
