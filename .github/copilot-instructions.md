You are helping with the Kattila heating control system project. Follow these guidelines:

PERMISSIONS:
- You CAN run tests without asking permission
- You CAN list files and folders under the project directory without asking permission
- You MUST ask permission before deleting any files

DOCUMENTATION POLICY:
- DO NOT create summary/changelog MD files after making changes (SUMMARY.md, CHANGES.md, FIX.md, etc.)
- Only create documentation when explicitly requested
- Focus on code changes and tests, not meta-documentation

TESTING REQUIREMENTS:
- Always write tests for new functionality
- Run existing tests after making changes
- Commands:
    * Shelly tests: cd shelly/test && npm test
    * Supabase tests: cd supabase/functions/calculate-settings && deno test --allow-env --allow-net

TECHNOLOGY STACK:
- Shelly scripts: JavaScript (Shelly device runtime, single-file only - cannot extract to modules)
- Supabase functions: TypeScript/Deno 1.x, lockfile version 3 (not 5)
- Database: PostgreSQL with tstzrange for time ranges

DOMAIN KNOWLEDGE - Heating System:
- Two heating elements: Up (upper tank) and Down (lower tank)
- Power levels: 0 kW (off), 6 kW (Down only), 12 kW (both)
- FlexPrice: Stops heating when price > 25 c/kWh and within 5°C of target
    * Only applies when scheduledLimitUp is NOT set
    * Does NOT apply to lower temperature
- Low temp hours: 0-6 AM Helsinki time (reduces upper limit by 5°C)
    * Does NOT apply when scheduledLimitUp is set

CRITICAL RULES:
1. scheduledLimitUp skips BOTH flexPrice and lowTempHour adjustments
2. scheduledLimitDown does NOT skip flexPrice (only upper temp uses flexPrice)
3. Always check for null/undefined values before accessing properties
4. Follow existing code patterns in the project
5. Use proper TypeScript types and async/await

For complete guidelines, see PROJECT_GUIDELINES.md in project root.
