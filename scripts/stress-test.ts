/**
 * CONCURRENCY & STRESS TEST BENCHMARK SUITE
 *
 * Compares:
 * 1. Naive Implementation (Simulates initial LLM implementation race condition & overselling)
 * 2. Optimized Implementation (ACID Transaction with PostgreSQL Row Locking SELECT ... FOR UPDATE)
 *
 * Usage:
 *   npx ts-node scripts/stress-test.ts
 *   Or with custom base URL:
 *   API_URL=https://your-deployed-service.onrender.com npx ts-node scripts/stress-test.ts
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

interface AuthTokens {
  organizerToken: string;
  customerToken: string;
}

async function request(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }
  return { status: response.status, data: json };
}

function printHeader(title: string) {
  console.log('\n================================================================');
  console.log(`  ${title}`);
  console.log('================================================================');
}

async function setupUsers(): Promise<AuthTokens> {
  const timestamp = Date.now();

  // 1. Register Organizer
  const orgEmail = `organizer_${timestamp}@test.com`;
  const orgRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: orgEmail,
      password: 'Password123!',
      name: 'Organizer Benchmark',
      role: 'ORGANIZER',
    }),
  });

  const organizerToken =
    orgRes.data?.data?.accessToken || orgRes.data?.accessToken;

  // 2. Register Customer
  const custEmail = `customer_${timestamp}@test.com`;
  const custRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: custEmail,
      password: 'Password123!',
      name: 'Customer Benchmark',
      role: 'CUSTOMER',
    }),
  });

  const customerToken =
    custRes.data?.data?.accessToken || custRes.data?.accessToken;

  if (!organizerToken || !customerToken) {
    throw new Error(
      `Failed to authenticate test users. Res: ${JSON.stringify({ orgRes, custRes })}`,
    );
  }

  return { organizerToken, customerToken };
}

async function createTestEvent(
  title: string,
  totalSeats: number,
  organizerToken: string,
): Promise<string> {
  const res = await request('/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${organizerToken}` },
    body: JSON.stringify({
      title,
      description: 'Stress Testing Concurrency Event',
      location: 'Benchmark Arena',
      dateTime: new Date(Date.now() + 86400000).toISOString(),
      totalSeats,
      price: 25.0,
    }),
  });

  const eventId = res.data?.data?.id || res.data?.id;
  if (!eventId) {
    throw new Error(`Failed to create test event: ${JSON.stringify(res)}`);
  }
  return eventId;
}

async function runScenario(
  scenarioName: string,
  eventId: string,
  totalSeats: number,
  concurrentRequests: number,
  mode: 'naive' | 'optimized',
  customerToken: string,
) {
  printHeader(`Running Scenario: ${scenarioName} (${mode.toUpperCase()} MODE)`);
  console.log(`Total Available Seats: ${totalSeats}`);
  console.log(`Concurrent Incoming Booking Requests: ${concurrentRequests}`);
  console.log(`Firing requests in parallel...\n`);

  const startTime = Date.now();

  const promises = Array.from({ length: concurrentRequests }).map(async (_, idx) => {
    const reqStart = Date.now();
    try {
      const res = await request('/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          eventId,
          seatsCount: 1,
          mode,
        }),
      });
      const reqDuration = Date.now() - reqStart;
      return {
        status: res.status,
        duration: reqDuration,
        success: res.status === 201,
        message: res.data?.message || 'Success',
      };
    } catch (err: any) {
      return {
        status: 500,
        duration: Date.now() - reqStart,
        success: false,
        message: err.message,
      };
    }
  });

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  const successfulBookings = results.filter((r) => r.status === 201).length;
  const rejectedRequests = results.filter((r) => r.status === 400).length;
  const failedRequests = results.filter((r) => r.status >= 500).length;

  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  const p99 = durations[Math.floor(durations.length * 0.99)];
  const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  const rps = ((concurrentRequests / totalDuration) * 1000).toFixed(1);

  // Fetch final event state
  const eventRes = await request(`/events/${eventId}`);
  const finalEvent = eventRes.data?.data || eventRes.data;

  console.log(`--- RESULTS SUMMARY ---`);
  console.log(`Total Time Elapsed:     ${totalDuration}ms`);
  console.log(`Throughput:             ${rps} req/sec`);
  console.log(`Latency p50:            ${p50}ms`);
  console.log(`Latency p95:            ${p95}ms`);
  console.log(`Latency p99:            ${p99}ms`);
  console.log(`Successful (HTTP 201):  ${successfulBookings}`);
  console.log(`Rejected (HTTP 400):    ${rejectedRequests}`);
  console.log(`Server Errors (HTTP 5xx):${failedRequests}`);
  console.log(`Final Available Seats:  ${finalEvent?.availableSeats}`);

  if (successfulBookings > totalSeats) {
    const oversold = successfulBookings - totalSeats;
    console.log(`\n❌ CRITICAL DEFECT DETECTED: RACE CONDITION / OVERSELLING!`);
    console.log(`   Capacity was ${totalSeats}, but ${successfulBookings} tickets were confirmed!`);
    console.log(`   Oversold by ${oversold} seats! (Stale read & lost update defect)\n`);
  } else if (successfulBookings === totalSeats && rejectedRequests === concurrentRequests - totalSeats) {
    console.log(`\n✅ 100% ACID COMPLIANT & CONCURRENCY SAFE!`);
    console.log(`   Exactly ${successfulBookings}/${totalSeats} seats were booked.`);
    console.log(`   Remaining ${rejectedRequests} requests were cleanly rejected with HTTP 400.`);
    console.log(`   ZERO race conditions, ZERO overselling.\n`);
  }

  return {
    mode,
    totalDuration,
    rps,
    successfulBookings,
    rejectedRequests,
    failedRequests,
    oversold: Math.max(0, successfulBookings - totalSeats),
    p95,
  };
}

async function main() {
  printHeader('EVENT BOOKING SYSTEM - CONCURRENCY STRESS BENCHMARK');
  console.log(`Target Base URL: ${BASE_URL}`);

  try {
    console.log('\n[1/3] Authenticating test users...');
    const { organizerToken, customerToken } = await setupUsers();
    console.log('✓ Test users ready.');

    const SEATS = 20;
    const CONCURRENT_USERS = 60;

    // Test 1: Naive Mode
    console.log('\n[2/3] Setting up Naive implementation stress test...');
    const naiveEventId = await createTestEvent('Naive Race Condition Event', SEATS, organizerToken);
    const naiveReport = await runScenario(
      'Baseline / Naive Implementation',
      naiveEventId,
      SEATS,
      CONCURRENT_USERS,
      'naive',
      customerToken,
    );

    // Test 2: Optimized Mode
    console.log('\n[3/3] Setting up Optimized atomic locking stress test...');
    const optEventId = await createTestEvent('Optimized Concurrency Event', SEATS, organizerToken);
    const optReport = await runScenario(
      'Optimized Atomic Locking Implementation',
      optEventId,
      SEATS,
      CONCURRENT_USERS,
      'optimized',
      customerToken,
    );

    // Comparison Table
    printHeader('FINAL PERFORMANCE DELTA COMPARISON (FOR DEMO VIDEO)');
    console.table([
      {
        Metric: 'Total Seats',
        'Naive (Baseline)': SEATS,
        'Optimized (ACID Lock)': SEATS,
      },
      {
        Metric: 'Concurrent Bookers',
        'Naive (Baseline)': CONCURRENT_USERS,
        'Optimized (ACID Lock)': CONCURRENT_USERS,
      },
      {
        Metric: 'Confirmed Bookings',
        'Naive (Baseline)': naiveReport.successfulBookings,
        'Optimized (ACID Lock)': optReport.successfulBookings,
      },
      {
        Metric: 'Oversold Tickets',
        'Naive (Baseline)': `${naiveReport.oversold} (DATA CORRUPTION)`,
        'Optimized (ACID Lock)': `${optReport.oversold} (STRICTLY 0)`,
      },
      {
        Metric: 'Throughput (RPS)',
        'Naive (Baseline)': `${naiveReport.rps} req/s`,
        'Optimized (ACID Lock)': `${optReport.rps} req/s`,
      },
      {
        Metric: 'Latency (p95)',
        'Naive (Baseline)': `${naiveReport.p95}ms`,
        'Optimized (ACID Lock)': `${optReport.p95}ms`,
      },
    ]);
  } catch (error) {
    console.error('Benchmark execution failed:', error);
  }
}

main();
