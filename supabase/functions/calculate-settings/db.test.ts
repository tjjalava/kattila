import "./test-setup.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  DOWN,
  RESISTOR_DOWN,
  RESISTOR_UP,
  UP,
} from "./db.ts";

// Note: These are integration-style tests that verify the constants and
// structure rather than mocking the complex Supabase client.
// For full integration testing, run against a local Supabase instance.

Deno.test("Database constants - peripheral IDs are defined", () => {
  assertEquals(UP, "100");
  assertEquals(DOWN, "101");
});

Deno.test("Database constants - resistor state IDs are defined", () => {
  assertEquals(RESISTOR_UP, "6");
  assertEquals(RESISTOR_DOWN, "12");
});

// Additional integration tests would go here
// They should be run against a local Supabase instance with:
// - supabase start
// - Test data seeded
// - Actual database queries executed

Deno.test("Database structure - types are exported correctly", () => {
  // Verify that the module exports the expected types
  assertEquals(typeof UP, "string");
  assertEquals(typeof DOWN, "string");
  assertEquals(typeof RESISTOR_UP, "string");
  assertEquals(typeof RESISTOR_DOWN, "string");
});






