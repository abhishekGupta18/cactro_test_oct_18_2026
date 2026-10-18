import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  IEventRepository,
  FindEventsParams,
} from './event.repository.interface';
import { Event, Prisma } from '@prisma/client';

@Injectable()
export class EventRepository implements IEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EventCreateInput): Promise<Event> {
    return this.prisma.event.create({
      data,
      include: {
        organizer: true,
      },
    });
  }

  async findById(id: string): Promise<(Event & { organizer?: any }) | null> {
    return this.prisma.event.findUnique({
      where: { id },
      include: {
        organizer: true,
      },
    });
  }

  async findAll(params: FindEventsParams): Promise<{ items: Event[]; total: number }> {
    const { search, location, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.EventWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dateTime: 'asc' },
        include: { organizer: true },
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.EventUpdateInput): Promise<Event> {
    return this.prisma.event.update({
      where: { id },
      data,
      include: {
        organizer: true,
      },
    });
  }

  async delete(id: string): Promise<Event> {
    return this.prisma.event.delete({
      where: { id },
    });
  }

  async findBookedCustomers(eventId: string): Promise<{ email: string; name: string }[]> {
    const bookings = await this.prisma.booking.findMany({
      where: {
        eventId,
        status: 'CONFIRMED',
      },
      select: {
        customer: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    const uniqueMap = new Map<string, string>();
    for (const b of bookings) {
      if (b.customer?.email) {
        uniqueMap.set(b.customer.email, b.customer.name);
      }
    }

    return Array.from(uniqueMap.entries()).map(([email, name]) => ({
      email,
      name,
    }));
  }
}
