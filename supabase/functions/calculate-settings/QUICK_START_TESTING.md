# Quick Start Guide - Testing

## Important Note

⚠️ **All tests require a running Supabase instance** because the modules import the Supabase client at the top level. Even unit tests need Supabase to be running to initialize successfully.

### One-Time Setup (Required for ALL Tests)

```bash
# 1. Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# 2. Start local Supabase
cd /Users/tjjalava/Work/kattila/supabase
supabase start

# Keep this running in the background for all tests
```

---

## Unit Tests

Fast tests that verify business logic with mocked dependencies.

```bash
cd /Users/tjjalava/Work/kattila/supabase/functions/calculate-settings

# Run unit tests
deno task test

# Watch mode (auto-rerun on changes)
deno task test:watch
```

**What's tested:** 18 tests covering HourlySetting class and calculateSettings algorithm
**Time:** ~50ms (after Supabase connection)
**Status:** ✅ ALL PASSING

---

## Integration Tests

Tests actual database operations against local Supabase instance.

```bash
cd /Users/tjjalava/Work/kattila/supabase/functions/calculate-settings

# Option 1: Automated script (checks Supabase is running)
./run-integration-tests.sh

# Option 2: Direct command
deno task test:integration

# Option 3: Watch mode
deno task test:integration:watch
```

**What's tested:** 11 tests covering all database operations
**Time:** ~500-1000ms
**Status:** ✅ READY TO RUN

---

## Run All Tests

```bash
# Run both unit and integration tests
deno task test:all
```

---

## Test Files

- `hourly-setting.test.ts` - Unit tests (18 tests)
- `integration.test.ts` - Integration tests (11 tests)
- `db.test.ts` - Basic structure tests (3 tests)
- `index.test.ts` - HTTP endpoint tests (17 tests)

---

## Documentation

- `TEST_README.md` - Complete testing guide
- `INTEGRATION_TEST_README.md` - Integration testing details
- `TEST_IMPLEMENTATION_SUMMARY.md` - Implementation summary

---

## Troubleshooting

### "Supabase is not running"
```bash
cd /Users/tjjalava/Work/kattila/supabase
supabase start
```

### "Tests are hanging"
Make sure Supabase is running:
```bash
supabase status
```

### "Database errors"
Reset the database:
```bash
supabase db reset
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `deno task test` | Run unit tests only |
| `deno task test:integration` | Run integration tests |
| `deno task test:all` | Run all tests |
| `./run-integration-tests.sh` | Auto-check and run integration |
| `deno task test:watch` | Unit tests in watch mode |
| `deno task test:integration:watch` | Integration tests in watch mode |

---

## Coverage

✅ **Unit Tests:** HourlySetting class, calculateSettings algorithm, temperature calculations, power optimization
✅ **Integration Tests:** Database reads/writes, RPC functions, heating plan management, lock handling
✅ **Total:** 29 tests covering the complete calculate-settings system


