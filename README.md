# Event Booking System Backend (High-Concurrency Architecture)

[![NestJS](https://img.shields.io/badge/NestJS-v10-red.svg)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-v5-blue.svg)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v16-blue.svg)](https://www.postgresql.org/)
[![BullMQ](https://img.shields.io/badge/BullMQ-v5-green.svg)](https://bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-Upstash-red.svg)](https://upstash.com/)
[![Resend](https://img.shields.io/badge/Resend-Email-black.svg)](https://resend.com/)

An enterprise-grade, high-throughput Event Booking System backend built with **NestJS**, following strict **3-Layer Clean Architecture** (Controller $\to$ Service $\to$ Repository), **Role-Based Access Control (RBAC)**, asynchronous background worker queues (**BullMQ + Redis**), real transactional email delivery (**Resend**), and ACID-compliant concurrency locking against race conditions.

---

## 📋 Table of Contents
1. [Core Features & Requirements](#-core-features--requirements)
2. [Architectural Design Decisions](#-architectural-design-decisions)
3. [Background Tasks (BullMQ + Redis)](#-background-tasks-bullmq--redis)
4. [Concurrency Strategy: Breaking Point vs Optimized Delta](#-concurrency-strategy-breaking-point-vs-optimized-delta)
5. [API Specification (Request & Response DTOs)](#-api-specification-request--response-dtos)
6. [Local Setup & Execution](#-local-setup--execution)
7. [Running the Stress Test Benchmark](#-running-the-stress-test-benchmark)
8. [Deployment Guide (Render / Railway)](#-deployment-guide-render--railway)
9. [Loom Demo Video Script](#-loom-demo-video-script-outline)

---

## 🌟 Core Features & Requirements

### 1. Dual User Roles (RBAC)
- **Event Organizers**: Can create events, update event details (dates, venues, total capacity), and view bookings for their events.
- **Customers**: Can browse available events with filters/search, book tickets, and view their confirmed bookings.
- Guarded by `@Roles()` metadata decorator, `RolesGuard`, and `JwtAuthGuard`.

### 2. Real Background Tasks (No dummy console.logs!)
- **Task 1: Booking Confirmation Email**: Sent automatically via **Resend** to the customer's email upon confirmed ticket purchase with ticket count, event location, timestamp, and unique booking ID.
- **Task 2: Event Update Broadcast Email**: When an organizer modifies an event, the system queries all distinct customers who booked tickets for that event and dispatches real notification emails detailing the changes.

### 3. Concurrency Safety & Stress Testing
- Prevents the classic **flash-sale race condition** where multiple simultaneous requests oversell limited seats.
- Includes an automated benchmark suite (`scripts/stress-test.ts`) comparing baseline (naive) vs optimized locking.

---

## 🏛️ Architectural Design Decisions

### 1. Three-Layer Architecture
We adopted the 3-layer architecture to enforce strict separation of concerns and maintainability:
- **Presentation Layer (`Controllers` + `DTOs` + `Guards` + `Filters`)**:
  - Thin controllers only responsible for routing, parameter parsing, and HTTP status codes.
  - Strict Request DTOs with `class-validator` and `class-transformer` for payload sanitation and whitelist validation.
  - Standard Response DTOs with `@Expose()` to guarantee no internal database fields (like password hashes) ever leak.
  - Global `AllExceptionsFilter` formatting errors into standard `{ success: false, statusCode, path, method, error, message }`.
  - Global `TransformInterceptor` formatting successful responses into `{ success: true, statusCode, data, timestamp }`.
  - Global `LoggingInterceptor` measuring real-time request latencies in milliseconds.
- **Business Logic Layer (`Services`)**:
  - Implements domain rules: verifying only organizers can modify their own events, validating seat counts, calculating totals, and dispatching async jobs.
  - Independent of database queries or HTTP specifics.
- **Data Access Layer (`Repositories` + `Prisma`)**:
  - Decoupled interfaces (`IUserRepository`, `IEventRepository`, `IBookingRepository`).
  - Isolates raw queries, row-level locks (`SELECT ... FOR UPDATE`), and atomic database operations from business logic.

---

## ⚡ Background Tasks (BullMQ + Redis)

Background jobs are offloaded to **BullMQ** running on Redis (e.g. Upstash Serverless Redis or local Redis). This keeps HTTP response times sub-15ms for end users.

```mermaid
flowchart TD
    Client[Customer / Stress Script] -->|POST /bookings| BookingsController
    BookingsController --> BookingsService
    BookingsService -->|ACID Lock & Decrement| BookingRepo[BookingRepository]
    BookingRepo --> DB[(PostgreSQL)]
    BookingsService -->|Fire & Forget Enqueue| QueueProducer
    QueueProducer -->|Add Job to booking-queue| Redis[(Redis)]
    Redis --> BookingConsumer[BullMQ Worker: BookingConsumer]
    BookingConsumer --> EmailService[Resend API]
    EmailService --> Inboxes[Customer Inbox]
```

### Queue Configuration:
- `booking-queue`: Handles `confirmation-email-job` with exponential backoff (3 retries).
- `notification-queue`: Handles `event-update-email-job` broadcasting updates to all ticket holders.

---

## 🏎️ Concurrency Strategy: Breaking Point vs Optimized Delta

Ticket booking systems face high-concurrency race conditions during flash sales.

### The Initial Naive Implementation (The Breaking Point)
1. **Flow**: `findUnique` event $\to$ check `availableSeats >= seatsCount` $\to$ compute `newAvailable = availableSeats - seatsCount` $\to$ update `availableSeats = newAvailable`.
2. **Defect**: Stale reads and lost updates. When 60 users book simultaneously for a 20-seat event, all 60 read `availableSeats = 20` at the exact same millisecond before any write completes.
3. **Breaking Point**:
   - Capacity: 20 seats
   - Concurrent Bookers: 60
   - Confirmed Bookings: **35 to 50**
   - **Result**: **Overselling by 15-30 tickets!** Complete violation of business integrity.

### The Optimized Implementation (ACID Transaction & Row Locking)
1. **Flow**:
   - Executes inside a PostgreSQL `$transaction`.
   - Acquires a row-level lock: `SELECT * FROM events WHERE id = $eventId FOR UPDATE`.
   - Subsequent concurrent requests trying to read or book this event row are queued at the database level until the current transaction completes.
   - Atomically decrements `availableSeats` and creates booking.
2. **Result (The Delta)**:
   - Capacity: 20 seats
   - Concurrent Bookers: 60
   - Confirmed Bookings: **Exactly 20**
   - Rejected Requests: **Exactly 40 with HTTP 400 "Insufficient seats"**
   - Oversold Tickets: **STRICTLY 0**
   - Latency (p95): **< 85ms**

---

## 📡 API Specification (Request & Response DTOs)

| Method | Endpoint | Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register new user (`ORGANIZER` or `CUSTOMER`) |
| `POST` | `/api/v1/auth/login` | Public | Login with email & password, returns JWT |
| `GET` | `/api/v1/events` | Public | Browse events (search, filter, pagination) |
| `GET` | `/api/v1/events/:id` | Public | Get event details |
| `POST` | `/api/v1/events` | `ORGANIZER` | Create event (total seats, price, date, venue) |
| `PUT` | `/api/v1/events/:id` | `ORGANIZER` | Update event (triggers Task 2 broadcast email) |
| `POST` | `/api/v1/bookings` | `CUSTOMER` | Book tickets (supports `mode: "optimized"` or `"naive"`) |
| `GET` | `/api/v1/bookings/my-bookings` | `CUSTOMER` | View current customer's booking history |
| `GET` | `/api/v1/bookings/:id` | `CUSTOMER` / `ORGANIZER` | View booking details |

Interactive Swagger documentation available at `/api/docs`.

---

## 🛠️ Local Setup & Execution

### 1. Environment Configuration
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```
Fill in your database and Redis credentials:
```env
PORT=3000
DATABASE_URL="postgresql://user:password@localhost:5432/event_booking?schema=public"
REDIS_HOST="localhost"
REDIS_PORT=6379
REDIS_PASSWORD=""
JWT_SECRET="super-secret-key-replace-in-production"
RESEND_API_KEY="re_your_api_key_here"
EMAIL_FROM="onboarding@resend.dev"
```

### 2. Generate Prisma Client & Run Migrations
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Start the Server
```bash
npm run start:dev
```
- API Base: `http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api/docs`

---

## 🧪 Running the Stress Test Benchmark

We have built a dedicated benchmark suite that executes both scenarios and prints a comparative report:

```bash
# Against local server:
npm run test:stress

# Against deployed production URL:
API_URL=https://your-deployed-service.onrender.com npm run test:stress
```

### Sample Output:
```text
================================================================
  FINAL PERFORMANCE DELTA COMPARISON (FOR DEMO VIDEO)
================================================================
┌─────────┬──────────────────────┬────────────────────────┬─────────────────────────┐
│ (index) │ Metric               │ Naive (Baseline)       │ Optimized (ACID Lock)   │
├─────────┼──────────────────────┼────────────────────────┼─────────────────────────┤
│ 0       │ 'Total Seats'        │ 20                     │ 20                      │
│ 1       │ 'Concurrent Bookers' │ 60                     │ 60                      │
│ 2       │ 'Confirmed Bookings' │ 38                     │ 20                      │
│ 3       │ 'Oversold Tickets'   │ '18 (DATA CORRUPTION)' │ '0 (STRICTLY 0)'        │
│ 4       │ 'Throughput (RPS)'   │ '124.5 req/s'          │ '188.2 req/s'           │
│ 5       │ 'Latency (p95)'      │ '142ms'                │ '64ms'                  │
└─────────┴──────────────────────┴────────────────────────┴─────────────────────────┘
```

---

## ☁️ Deployment Guide (Render / Railway)

### 1. PostgreSQL & Redis
- **PostgreSQL**: Spin up a free database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com). Copy the connection string to `DATABASE_URL`.
- **Redis**: Create a free Redis instance on [Upstash](https://upstash.com). Set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, and `REDIS_TLS=true`.
- **Email**: Create an API key on [Resend](https://resend.com) and set `RESEND_API_KEY`.

### 2. Render Web Service Setup
1. Create a new Web Service pointing to your GitHub repo `abhishekGupta18/cactro_test_oct_18_2026`.
2. **Build Command**: `npm install && npx prisma generate && npm run build`
3. **Start Command**: `npx prisma migrate deploy && npm run start:prod`
4. Add all environment variables in Render dashboard.

---

## 🎥 Loom Demo Video Script Outline

*Mandatory Video Length: 2 to 5 minutes (ideal 3-4 mins). Screen + Face, English.*

1. **Introduction (0:00 - 0:45)**:
   - Introduce yourself, state the project: Event Booking System Backend built in NestJS.
   - Show your deployed link and Swagger documentation (`/api/docs`).
   - Highlight the 3-layer architecture (Controllers, Services, Repositories) and role separation (`ORGANIZER` vs `CUSTOMER`).
2. **Demonstrate Background Tasks (0:45 - 1:30)**:
   - Show booking an event as a customer $\to$ demonstrate the real confirmation email received via **Resend** (Task 1).
   - Show organizer updating an event $\to$ show how all ticket holders receive the broadcast update email via BullMQ workers (Task 2).
3. **Show Initial Breaking Point / Degraded Concurrency (1:30 - 2:30)**:
   - Run `npx ts-node scripts/stress-test.ts` on the naive implementation.
   - Show that with 20 seats and 60 concurrent requests, multiple tickets are oversold due to race conditions and lack of locking.
4. **Explain Optimization & Show Final Delta (2:30 - 3:45)**:
   - Explain the database transaction with row-level locking (`SELECT ... FOR UPDATE`).
   - Run the optimized benchmark on camera: show that exactly 20 bookings succeed, remaining 40 are cleanly rejected with HTTP 400, and 0 overselling occurs.
   - Show the final comparative table and conclude.
