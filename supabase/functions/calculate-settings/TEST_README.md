# Calculate Settings Tests

This directory contains comprehensive unit tests for the calculate-settings edge function.

## Test Files

### `hourly-setting.test.ts`
Tests for the `HourlySetting` class and `calculateSettings` algorithm:
- Temperature calculations with different power levels (0, 6, 12 kW)
- Power state transitions and caching behavior
- Actual power capping at maxTemp constraints
- Cost calculations with transmission prices
- Low-temperature hour detection (0-6 AM Helsinki time)
- Schedule limit overrides
- Flex price threshold behavior (>25 c/kWh)
- Power optimization between consecutive hours
- Temperature state chain maintenance

### `db.test.ts`
Tests for database operations with mocked dependencies:
- `getTemperature()` - Fetching latest temperature readings
- `getDropRates()` - Temperature drop rate calculations
- `getIncreaseRates()` - Heating rate calculations
- `getTemperatureSchedule()` - Schedule-based temperature limits
- `getHeatingPlan()` - Retrieving future heating plans
- `savePlan()` - Upserting heating plans with lock management
- Error handling for database failures

### `index.test.ts`
Integration tests for the HTTP endpoint:
- Query parameter parsing (`up`, `down`, `power`, `verbose`, `force`)
- Default value handling
- Locked plan bypass logic
- Response format validation (normal vs verbose mode)
- Error handling (400/500 responses)
- Request method validation (GET only)

### `test-fixtures.ts`
Shared test utilities and mock data:
- Mock element properties and state configurations
- Price data fixtures
- Database response mocks
- Helper functions for creating test scenarios
- Helsinki timezone utilities for low-temp hour testing

## Running Tests

```bash
# Run all tests
deno task test

# Run tests in watch mode (auto-rerun on changes)
deno task test:watch

# Run tests with coverage
deno task test:coverage

# Generate coverage report
deno task test:coverage-report
```

## Running Individual Test Files

```bash
# Test HourlySetting class and calculation logic
deno test hourly-setting.test.ts --allow-all

# Test database operations
deno test db.test.ts --allow-all

# Test HTTP endpoint
deno test index.test.ts --allow-all
```

## Test Structure

All tests follow the Deno testing conventions using:
- `Deno.test()` for test definitions
- `jsr:@std/assert` for assertions
- `jsr:@std/testing/mock` for stubs and mocks

## Mock Strategy

### Database Mocking
Database operations are mocked using `stub()` from `@std/testing/mock` to:
- Avoid real database connections during tests
- Provide deterministic test data
- Test error handling scenarios
- Verify correct parameters are passed to database functions

### External API Mocking
External APIs (price fetching, transmission prices) are stubbed to:
- Eliminate network dependencies
- Provide consistent test data
- Test various price scenarios
- Speed up test execution

## Key Test Scenarios

### Temperature Calculations
Tests verify that temperature changes correctly based on:
- Current power level (0, 6, or 12 kW)
- Heating element properties (increase/decrease rates)
- Maximum temperature constraints
- Previous state temperatures

### Heating Optimization
Tests verify the algorithm:
- Heats during cheapest hours first
- Respects maximum temperature limits
- Applies schedule overrides when present
- Reduces heating during expensive hours (flex pricing)
- Optimizes power distribution between consecutive hours
- Applies lower targets during night hours (0-6 AM)

### State Management
Tests verify:
- Temperature state propagates through hourly chain
- Cache invalidation on power changes
- Locked plan prevents recalculation (unless forced)
- Current hour is marked as locked when saved

## Adding New Tests

When adding new features, ensure tests cover:

1. **Unit Tests**: Individual function behavior with mocked dependencies
2. **Integration Tests**: Component interaction with realistic scenarios
3. **Edge Cases**: Boundary conditions, invalid inputs, error states
4. **Property Tests**: Consider using property-based testing for numeric calculations

Example test structure:

```typescript
Deno.test("Feature - specific scenario description", async () => {
  // Arrange: Set up test data and mocks
  const mockData = { /* ... */ };
  const stub = stub(dependency, "method", returnsNext([mockData]));
  
  try {
    // Act: Execute the code under test
    const result = await functionUnderTest();
    
    // Assert: Verify expected behavior
    assertEquals(result, expectedValue);
  } finally {
    // Cleanup: Restore stubs
    stub.restore();
  }
});
```

## Coverage Goals

Aim for:
- **90%+** line coverage for core business logic (`hourly-setting.ts`, `calculateSettings`)
- **80%+** line coverage for database operations (`db.ts`)
- **70%+** line coverage for HTTP endpoint (`index.ts`)

## Continuous Integration

These tests should be run:
- Before committing changes
- In CI/CD pipeline on pull requests
- Before deploying to production

## Troubleshooting

### Tests Fail Due to Timezone Issues
Low-temp hour tests depend on Helsinki timezone (EET/EEST). If tests fail:
- Check that `@date-fns/tz` is correctly handling timezone conversion
- Verify test dates are using correct UTC offsets

### Mock Stubs Not Working
If mocks aren't intercepting calls:
- Ensure stubs are created before the tested function is called
- Verify stub targets match actual import paths
- Check that stubs are properly restored in `finally` blocks

### Import Resolution Issues
If tests can't find modules:
- Verify `deno.json` import map is correct
- Check that test files use the same import aliases as source code
- Ensure all dependencies are cached: `deno cache --reload **/*.ts`

