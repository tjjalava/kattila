# Kattila Project - Development Guidelines

> **Note**: GitHub Copilot in JetBrains IDEs automatically loads instructions from `.github/copilot-instructions.md`

This file provides instructions for AI assistants and developers working on the Kattila heating control system.

## Permissions for AI Agents

**You CAN do without asking:**
- Run tests (`npm test`, `deno test`, etc.)
- List files and folders in the project directory (`ls`, `find`, `tree`, etc.)
- Read file contents
- Check file existence

**You MUST ask permission before:**
- Deleting any files (`rm`, `git rm`, etc.)
- Destructive operations that cannot be undone

## Documentation Policy
- **DO NOT create summary/changelog MD files** after making changes (e.g., SUMMARY.md, CHANGES.md, FIX_SUMMARY.md)
- Only create documentation when explicitly requested
- Focus on code changes and tests, not meta-documentation

## Technology Stack

### Shelly Scripts (JavaScript)
- Environment: Shelly device JavaScript (limited Node.js compatibility)
- Testing: Node.js with VM contexts for script isolation
- Globals: `Shelly`, `Timer`, `print`, custom `Date`
- **Important**: Cannot extract logic to modules - everything must be in one file

### Supabase Functions (TypeScript/Deno)
- Runtime: Deno 1.x
- Database: PostgreSQL with Supabase client
- Testing: `deno test --allow-env --allow-net`
- Lockfile: Use version 3 for Supabase compatibility (not version 5)

## Testing Requirements
- **Always write tests** for new functionality
- Run existing tests after making changes
- Use descriptive test names
- Follow existing test patterns in `*.test.ts` files

## Domain Knowledge

### Heating System
- Two elements: **Up** (upper tank) and **Down** (lower tank)
- Power levels: 0 kW (off), 6 kW (Down only), 12 kW (both)
- **Low temp hours**: 0-6 AM Helsinki time (reduces upper limit by 5°C)
- **FlexPrice**: Stops heating when price > 25 c/kWh and within 5°C of target
  - Only applies to **upper** temperature (`scheduledLimitUp`)
  - Does NOT apply to lower temperature

### Scheduled Limits
- `scheduledLimitUp`: Overrides upper temperature target
  - When set: **skips lowTempHour adjustment** and **skips flexPrice logic**
- `scheduledLimitDown`: Overrides lower temperature target
  - When set: flexPrice **still applies** (flexPrice is only about upper heating)

## Key Rules

### DO NOT
1. Create summary MD files after changes
2. Add lockfile version 5 (use version 3)
3. Extract Shelly script logic to separate files
4. Skip running tests after changes
5. Make scheduledLimitDown skip flexPrice (only scheduledLimitUp does)

### DO
1. Write tests for all new functionality
2. Run existing tests to verify changes
3. Use descriptive variable and function names
4. Add type annotations for TypeScript
5. Handle edge cases (null values, boundary conditions)
6. Check for errors after file edits
7. Validate changes work by running tests

## Running Tests

### Shelly scripts
```bash
cd shelly/test
npm test
```

### Supabase functions
```bash
cd supabase/functions/calculate-settings
deno test --allow-env --allow-net hourly-setting.test.ts
```

## Project Structure
- `shelly/scripts/` - Production scripts for Shelly devices
- `shelly/test/` - Node.js tests for Shelly scripts
- `supabase/functions/` - Deno Edge Functions
- `supabase/migrations/` - Database schema migrations

---

**Focus on code quality and test coverage, not documentation bloat.**



