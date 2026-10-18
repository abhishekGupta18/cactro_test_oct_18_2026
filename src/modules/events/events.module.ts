import { Module } from '@nestjs/common';
import { EventsController } from './controllers/events.controller';
import { EventsService } from './services/events.service';
import { EventRepository } from './repositories/event.repository';
import { EVENT_REPOSITORY } from './repositories/event.repository.interface';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [QueuesModule],
  controllers: [EventsController],
  providers: [
    EventsService,
    {
      provide: EVENT_REPOSITORY,
      useClass: EventRepository,
    },
  ],
  exports: [EventsService, EVENT_REPOSITORY],
})
export class EventsModule {}
