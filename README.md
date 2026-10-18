# Event Booking System Backend

Enterprise-grade, high-concurrency backend API for an **Event Booking System** built with **NestJS**, **PostgreSQL (Prisma ORM)**, **BullMQ**, **Redis**, and **Resend**.

Designed according to industry-standard **3-layer architecture** (Controllers $\to$ Services $\to$ Repositories) with strict Role-Based Access Control (RBAC), atomic concurrency control, and asynchronous background job queues.

---

## 🚀 Key Features

- **Role-Based Access Control (RBAC)**:
  - `ORGANIZER`: Create, update, cancel, and manage events.
  - `CUSTOMER`: Browse events, book tickets, and view booking history.
  - Guarded with JWT authentication and custom role decorators.
- **3-Layer Clean Architecture**:
  - **Presentation Layer**: Thin controllers, DTOs with `class-validator`, standard exception filters, logging interceptors.
  - **Business Layer**: Domain services handling business logic, transactions, capacity validations, and job dispatching.
  - **Data Access Layer**: Repositories encapsulating Prisma queries, atomic database operations, and pessimistic locks (`SELECT ... FOR UPDATE`).
- **Asynchronous Background Processing (BullMQ + Redis)**:
  - **Task 1: Booking Confirmation Email** — Sent immediately to customers upon booking confirmation via **Resend**.
  - **Task 2: Event Update Broadcast Email** — Sent to all customers who booked tickets when an organizer updates event details.
- **Concurrency & Race Condition Handling**:
  - Compares naive booking (prone to overselling and deadlocks under stress) vs optimized booking (atomic decrement & transaction locking).
- **Interactive API Documentation**:
  - Swagger UI accessible at `/api/docs`.

---

## 🏛️ Architecture Overview

```text
src/
├── common/             # Global filters, interceptors, guards, decorators, and constants
├── config/             # Type-safe environment variable validation
├── database/           # Prisma service and database module
├── modules/
│   ├── auth/           # Authentication (JWT, login, register, bcrypt)
│   ├── users/          # User repository & service
│   ├── events/         # Event management (Controller, Service, Repository, DTOs)
│   ├── bookings/       # Booking transactions & concurrency control (Controller, Service, Repository, DTOs)
│   ├── notifications/  # Resend email delivery service
│   └── queues/         # BullMQ queue producers and background worker consumers
├── app.module.ts
└── main.ts
```

---

## 🛠️ Setup & Local Development

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (Local or Cloud like Supabase/Neon)
- Redis (Local or Upstash Redis)

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Database Migration
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 5. Run Server
```bash
npm run start:dev
```
- Swagger API Docs: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- REST API Base: [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

---

## 🧪 Stress Testing & Performance Benchmark

We include an automated stress test script (`scripts/stress-test.ts`) using `autocannon` to test high concurrency ticket booking scenarios and identify breaking points:

```bash
npm run test:stress
```
