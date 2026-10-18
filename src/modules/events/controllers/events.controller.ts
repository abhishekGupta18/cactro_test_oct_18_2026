import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EventsService } from '../services/events.service';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { QueryEventsDto } from '../dto/query-event.dto';
import { EventResponseDto } from '../dto/event-response.dto';
import { PaginatedEventResponseDto } from '../dto/paginated-event-response.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../common/constants/roles.enum';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/public.decorator';

@ApiTags('Events')
@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new event (Event Organizers only)',
    description: 'Requires an authenticated user with ORGANIZER role.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Event created successfully',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden: caller is not an ORGANIZER',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createEventDto: CreateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.create(user.id, createEventDto);
  }

  @Put(':id')
  @Roles(Role.ORGANIZER)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update event details (Event Organizers only)',
    description:
      'Only the organizer who created the event can update it. Automatically enqueues Task 2 notification emails to all booked customers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event updated and notifications enqueued',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden: caller does not own this event',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<EventResponseDto> {
    return this.eventsService.update(id, user.id, updateEventDto);
  }

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Browse events with search, location filter, and pagination',
    description: 'Public endpoint accessible by all users and customers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of events',
    type: PaginatedEventResponseDto,
  })
  async findAll(
    @Query() query: QueryEventsDto,
  ): Promise<PaginatedEventResponseDto> {
    return this.eventsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get event details by ID',
    description: 'Public endpoint accessible by all users and customers.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Event details',
    type: EventResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Event not found',
  })
  async findById(@Param('id') id: string): Promise<EventResponseDto> {
    return this.eventsService.findById(id);
  }
}
