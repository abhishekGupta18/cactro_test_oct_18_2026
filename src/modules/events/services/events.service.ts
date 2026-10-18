import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  EVENT_REPOSITORY,
  IEventRepository,
} from '../repositories/event.repository.interface';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { QueryEventsDto } from '../dto/query-event.dto';
import { EventResponseDto } from '../dto/event-response.dto';
import { PaginatedEventResponseDto } from '../dto/paginated-event-response.dto';
import { QueueProducer } from '../../queues/producers/queue.producer';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepository: IEventRepository,
    private readonly queueProducer: QueueProducer,
  ) {}

  async create(
    organizerId: string,
    createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventRepository.create({
      title: createEventDto.title,
      description: createEventDto.description,
      location: createEventDto.location,
      dateTime: new Date(createEventDto.dateTime),
      totalSeats: createEventDto.totalSeats,
      availableSeats: createEventDto.totalSeats,
      price: createEventDto.price ?? 0,
      organizer: {
        connect: { id: organizerId },
      },
    });

    return plainToInstance(EventResponseDto, event);
  }

  async update(
    id: string,
    organizerId: string,
    updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    const existingEvent = await this.eventRepository.findById(id);
    if (!existingEvent) {
      throw new NotFoundException(`Event with ID '${id}' not found`);
    }

    if (existingEvent.organizerId !== organizerId) {
      throw new ForbiddenException(
        'You are not authorized to update this event. Only the event organizer can modify it.',
      );
    }

    const updateData: any = {};
    if (updateEventDto.title !== undefined) updateData.title = updateEventDto.title;
    if (updateEventDto.description !== undefined)
      updateData.description = updateEventDto.description;
    if (updateEventDto.location !== undefined)
      updateData.location = updateEventDto.location;
    if (updateEventDto.price !== undefined) updateData.price = updateEventDto.price;

    if (updateEventDto.dateTime !== undefined) {
      updateData.dateTime = new Date(updateEventDto.dateTime);
    }

    if (updateEventDto.totalSeats !== undefined) {
      const bookedSeats = existingEvent.totalSeats - existingEvent.availableSeats;
      if (updateEventDto.totalSeats < bookedSeats) {
        throw new BadRequestException(
          `Cannot reduce total seats to ${updateEventDto.totalSeats}. Already booked seats: ${bookedSeats}.`,
        );
      }
      updateData.totalSeats = updateEventDto.totalSeats;
      updateData.availableSeats = updateEventDto.totalSeats - bookedSeats;
    }

    const updatedEvent = await this.eventRepository.update(id, updateData);

    // Trigger Background Task 2: Event Update Notification to all customers who booked
    this.notifyBookedCustomers(updatedEvent, updateEventDto);

    return plainToInstance(EventResponseDto, updatedEvent);
  }

  private async notifyBookedCustomers(
    event: any,
    updateDto: UpdateEventDto,
  ): Promise<void> {
    try {
      const customers = await this.eventRepository.findBookedCustomers(event.id);
      this.logger.log(
        `Dispatching event update notifications to ${customers.length} customer(s) for event: ${event.title}`,
      );

      const updateMessage =
        updateDto.updateMessage ||
        `The event "${event.title}" details have been updated by the organizer.`;

      for (const customer of customers) {
        await this.queueProducer.enqueueEventUpdateNotification({
          to: customer.email,
          customerName: customer.name,
          eventTitle: event.title,
          updateMessage,
          newDateTime: updateDto.dateTime ? new Date(updateDto.dateTime) : undefined,
          newLocation: updateDto.location,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to dispatch update notifications for event ${event.id}`,
        error,
      );
    }
  }

  async findById(id: string): Promise<EventResponseDto> {
    const event = await this.eventRepository.findById(id);
    if (!event) {
      throw new NotFoundException(`Event with ID '${id}' not found`);
    }
    return plainToInstance(EventResponseDto, event);
  }

  async findAll(query: QueryEventsDto): Promise<PaginatedEventResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const { items, total } = await this.eventRepository.findAll({
      search: query.search,
      location: query.location,
      page,
      limit,
    });

    const transformedItems = items.map((item) =>
      plainToInstance(EventResponseDto, item),
    );

    return {
      items: transformedItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
