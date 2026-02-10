# Integration Testing Guide

This guide explains how to run integration tests against a local Supabase instance.

## Prerequisites

### 1. Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Or using npm
npm install -g supabase
```

### 2. Start Local Supabase

```bash
cd /Users/tjjalava/Work/kattila/supabase

# Start all services (PostgreSQL, PostgREST, GoTrue, etc.)
supabase start
```

This will output connection details:
```
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Note:** The tests use default local Supabase keys that are the same for all local installations. These are safe to commit and are already configured in the test files. If your local Supabase uses different keys, set them as environment variables before running tests:

```bash
export SUPABASE_URL="http://localhost:54321"
export SUPABASE_ANON_KEY="your-anon-key"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

### 3. Verify Migrations Are Applied

```bash
# Check migration status
supabase migration list

# Apply any pending migrations
supabase db reset
```

## Running Integration Tests

### Run All Integration Tests

```bash
cd /Users/tjjalava/Work/kattila/supabase/functions/calculate-settings

# Run integration tests
deno task test:integration
```

### Watch Mode (Auto-rerun on changes)

```bash
deno task test:integration:watch
```

### Run All Tests (Unit + Integration)

```bash
deno task test:all
```

## What's Tested

The integration tests verify actual database operations:

### Database Read Operations

✅ **getTemperature()** - Fetches latest temperature readings
- Inserts test temperature data
- Verifies correct retrieval for both UP and DOWN peripherals
- Cleans up after test

✅ **getDropRates()** - Calls RPC function for temperature drop rates
- Tests actual database function
- Verifies data structure and non-negative values

✅ **getIncreaseRates()** - Calls RPC function for temperature increase rates
- Tests with default 24h interval
- Tests with custom 48h interval
- Verifies data structure for power levels 6 and 12

✅ **getTemperatureSchedule()** - Retrieves schedule data
- Inserts test schedule with tstzrange
- Verifies schedule retrieval within time range
- Tests schedule limit application

✅ **getHeatingPlan()** - Retrieves future heating plan
- Inserts multiple hours of test plan
- Verifies correct filtering (only future hours)
- Tests plan structure

### Database Write Operations

✅ **savePlan()** - Upserts heating plan
- Tests single hour insertion
- Verifies data integrity (power, price, temperatures, etc.)
- Tests locked flag for current hour

✅ **savePlan() - Lock Management**
- Verifies current hour is marked as locked
- Verifies future hours are not locked
- Tests plan recalculation behavior

✅ **savePlan() - Upsert Behavior**
- Tests that existing records are updated, not duplicated
- Verifies proper handling of concurrent updates

## Test Data Management

All integration tests follow this pattern:

1. **Setup**: Insert minimal test data
2. **Execute**: Run the function being tested
3. **Assert**: Verify expected behavior
4. **Cleanup**: Remove test data

### Automatic Cleanup

Tests use `try/finally` blocks to ensure cleanup happens even if tests fail:

```typescript
try {
  await savePlan([setting], options, currentHour);
  // Assertions...
} finally {
  await client.from("heating_plan").delete()
    .eq("timestamp", currentHour.toISOString());
}
```

### Test Data Isolation

- Tests use dates in 2026 to avoid conflicts with real data
- Each test cleans up its own data
- Setup and teardown tests clean all test data

## Troubleshooting

### Error: "supabaseUrl is required"

Make sure Supabase is running:
```bash
supabase status
```

If not running:
```bash
supabase start
```

### Error: "relation does not exist"

Migrations haven't been applied:
```bash
supabase db reset
```

### Error: "function get_temperature_drop_rates() does not exist"

The RPC functions need to be created. Check that all migrations are applied:
```bash
supabase migration list
supabase db reset
```

### Tests Hang or Timeout

1. Check that Supabase is responding:
   ```bash
   curl http://localhost:54321/rest/v1/
   ```

2. Check PostgreSQL is running:
   ```bash
   supabase status
   ```

3. Try resetting the database:
   ```bash
   supabase db reset
   ```

### Port Conflicts

If Supabase can't start due to port conflicts:

```bash
# Stop Supabase
supabase stop

# Kill processes on conflicting ports
lsof -ti:54321 | xargs kill -9  # API
lsof -ti:54322 | xargs kill -9  # PostgreSQL
lsof -ti:54323 | xargs kill -9  # Studio

# Start again
supabase start
```

## Database State

### View Test Data

Connect to the database:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres
```

Query tables:
```sql
-- View heating plan
SELECT * FROM heating_plan ORDER BY timestamp DESC LIMIT 10;

-- View temperature readings
SELECT * FROM temperature ORDER BY timestamp DESC LIMIT 10;

-- View schedule
SELECT * FROM schedule ORDER BY range DESC LIMIT 10;
```

### Reset Database

To start fresh:
```bash
supabase db reset
```

This will:
- Drop all tables
- Reapply all migrations
- Run seed data (if configured)

## CI/CD Integration

To run integration tests in CI/CD:

```yaml
# .github/workflows/test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Deno
        uses: denoland/setup-deno@v1
        
      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        
      - name: Start Supabase
        run: |
          cd supabase
          supabase start
          
      - name: Run Integration Tests
        run: |
          cd supabase/functions/calculate-settings
          deno task test:integration
          
      - name: Stop Supabase
        if: always()
        run: supabase stop
```

## Best Practices

### 1. Test Data Dates
Use dates far in the future (2026+) to avoid conflicts with production-like data:
```typescript
const testTime = new Date("2026-02-11T12:00:00Z");
```

### 2. Always Cleanup
Use `try/finally` to ensure cleanup even on test failure:
```typescript
try {
  // Test code
} finally {
  await cleanup();
}
```

### 3. Isolate Tests
Each test should be independent and not rely on other tests:
```typescript
Deno.test({
  name: "Test name",
  fn: async () => {
    // Setup
    // Execute
    // Assert
    // Cleanup
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
```

### 4. Verify Both Success and Failure
Test both happy paths and error cases:
```typescript
// Happy path
const data = await getTemperature(UP);
assertExists(data);

// Error case
await assertRejects(
  async () => await someFunction(),
  Error,
  "Expected error message"
);
```

## Performance Considerations

Integration tests are slower than unit tests because they:
- Connect to actual database
- Execute real SQL queries
- Insert and delete data

Typical timing:
- Unit tests: ~50ms total
- Integration tests: ~500-1000ms total

For faster feedback during development:
1. Run unit tests (`deno task test`)
2. Run integration tests before committing (`deno task test:integration`)
3. Run all tests in CI/CD (`deno task test:all`)

## Next Steps

1. **Add more integration tests** for edge cases
2. **Test error scenarios** (connection failures, constraint violations)
3. **Add performance benchmarks** for database operations
4. **Create seed data** for consistent test scenarios
5. **Test concurrent operations** (multiple plans updating simultaneously)


