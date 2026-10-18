import { Event, Prisma } from '@prisma/client';

export const EVENT_REPOSITORY = 'EVENT_REPOSITORY';

export interface FindEventsParams {
  search?: string;
  location?: string;
  page: number;
  limit: number;
}

export interface IEventRepository {
  create(data: Prisma.EventCreateInput): Promise<Event>;
  findById(id: string): Promise<(Event & { organizer?: any }) | null>;
  findAll(params: FindEventsParams): Promise<{ items: Event[]; total: number }>;
  update(id: string, data: Prisma.EventUpdateInput): Promise<Event>;
  delete(id: string): Promise<Event>;
  findBookedCustomers(eventId: string): Promise<{ email: string; name: string }[]>;
}
