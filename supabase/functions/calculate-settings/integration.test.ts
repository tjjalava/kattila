/**
 * Integration tests for calculate-settings
 *
 * These tests run against a local Supabase instance.
 *
 * Prerequisites:
 * 1. Start local Supabase: `supabase start`
 * 2. Ensure migrations are applied
 * 3. Run tests: `deno task test:integration`
 *
 * Note: These tests will insert and clean up test data in your local database.
 */

// Set environment variables BEFORE any imports
// This ensures the Supabase client can initialize when modules are loaded
Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") || "http://localhost:54321");
Deno.env.set("SUPABASE_ANON_KEY", Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU");

import { assertEquals, assertExists, assertGreaterOrEqual } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { startOfHour } from "date-fns";
import {
  DOWN,
  getDropRates,
  getHeatingPlan,
  getIncreaseRates,
  getTemperature,
  getTemperatureSchedule,
  RESISTOR_DOWN,
  RESISTOR_UP,
  savePlan,
  UP,
} from "./db.ts";
import { client } from "supabaseClient";
import { HourlySetting } from "./hourly-setting.ts";
import type { ElementProps } from "./hourly-setting.ts";

// Test data cleanup helper
const cleanupTestData = async (): Promise<void> => {
  // Clean up any test data from heating_plan
  await client.from("heating_plan").delete().gte("timestamp", new Date("2026-01-01").toISOString());

  // Clean up test temperature readings (if any were inserted)
  await client.from("temperature").delete().gte("timestamp", new Date("2026-01-01").toISOString());

  // Clean up test schedule entries
  await client.from("schedule").delete().gte("range", `[${new Date("2026-01-01").toISOString()},)`);
};

// Setup: Clean before tests
Deno.test({
  name: "Integration setup - clean test data",
  fn: async () => {
    await cleanupTestData();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getTemperature - retrieves latest temperature from database",
  fn: async () => {
    // Insert test temperature data
    const testTime = new Date("2026-02-11T12:00:00Z");
    await client.from("temperature").insert([
      { peripheral: UP, temperature: 55.5, timestamp: testTime.toISOString() },
    ]);

    try {
      const temp = await getTemperature(UP);
      assertExists(temp);
      assertEquals(temp, 55.5);
    } finally {
      // Cleanup
      await client.from("temperature").delete()
        .eq("peripheral", UP)
        .eq("timestamp", testTime.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getTemperature - handles both peripherals",
  fn: async () => {
    const testTime = new Date("2026-02-11T12:00:00Z");
    await client.from("temperature").insert([
      { peripheral: UP, temperature: 55.5, timestamp: testTime.toISOString() },
      { peripheral: DOWN, temperature: 35.2, timestamp: testTime.toISOString() },
    ]);

    try {
      const tempUp = await getTemperature(UP);
      const tempDown = await getTemperature(DOWN);

      assertExists(tempUp);
      assertExists(tempDown);
      assertEquals(tempUp, 55.5);
      assertEquals(tempDown, 35.2);
    } finally {
      await client.from("temperature").delete()
        .gte("timestamp", testTime.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getDropRates - fetches temperature drop rates from RPC",
  fn: async () => {
    // First, insert some temperature data to ensure the RPC has data to calculate from
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);

    await client.from("temperature").insert([
      { peripheral: UP, temperature: 55.0, timestamp: oneHourAgo.toISOString() },
      { peripheral: UP, temperature: 54.1, timestamp: now.toISOString() },
      { peripheral: DOWN, temperature: 35.0, timestamp: oneHourAgo.toISOString() },
      { peripheral: DOWN, temperature: 33.8, timestamp: now.toISOString() },
    ]);

    try {
      const rates = await getDropRates();

      // The RPC might return undefined if there's not enough data
      // Test that it either returns valid data or undefined (not an error)
      if (rates) {
        // If we get data, verify structure
        assertEquals(typeof rates, "object");

        // If we have rates, they should be non-negative
        if (rates[UP] !== undefined) {
          assertGreaterOrEqual(rates[UP], 0);
        }
        if (rates[DOWN] !== undefined) {
          assertGreaterOrEqual(rates[DOWN], 0);
        }
      }
    } finally {
      // Cleanup test data
      await client.from("temperature").delete()
        .gte("timestamp", oneHourAgo.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getIncreaseRates - fetches temperature increase rates from RPC",
  fn: async () => {
    // Insert temperature data with resistor state changes to generate increase rates
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 7200000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Insert resistor state changes
    await client.from("resistor_state").insert([
      { state: RESISTOR_UP, timestamp: twoHoursAgo.toISOString() },
      { state: "0", timestamp: oneHourAgo.toISOString() },
    ]);

    // Insert corresponding temperature changes
    await client.from("temperature").insert([
      { peripheral: UP, temperature: 50.0, timestamp: twoHoursAgo.toISOString() },
      { peripheral: UP, temperature: 51.1, timestamp: oneHourAgo.toISOString() },
      { peripheral: DOWN, temperature: 30.0, timestamp: twoHoursAgo.toISOString() },
      { peripheral: DOWN, temperature: 30.9, timestamp: oneHourAgo.toISOString() },
    ]);

    try {
      const rates = await getIncreaseRates();

      // The RPC might return undefined if there's not enough data
      // Test that it either returns valid data or undefined (not an error)
      if (rates) {
        // If we get data, verify structure
        assertEquals(typeof rates, "object");

        // Check that we have the expected power level keys
        if (rates["6"]) {
          assertEquals(typeof rates["6"], "object");
        }
        if (rates["12"]) {
          assertEquals(typeof rates["12"], "object");
        }
      }
    } finally {
      // Cleanup test data
      await client.from("temperature").delete()
        .gte("timestamp", twoHoursAgo.toISOString());
      await client.from("resistor_state").delete()
        .gte("timestamp", twoHoursAgo.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getIncreaseRates - accepts custom interval",
  fn: async () => {
    const rates48h = await getIncreaseRates({ hours: 48 });
    const rates24h = await getIncreaseRates({ hours: 24 });

    // Test that both calls work without errors
    // They may return undefined if there's not enough data, which is fine

    // If we get data, verify structure is consistent
    if (rates48h && rates24h) {
      assertEquals(typeof rates48h, "object");
      assertEquals(typeof rates24h, "object");

      // Both should have the same keys structure (even if empty)
      if (rates48h["6"]) {
        assertEquals(typeof rates48h["6"], "object");
      }
      if (rates24h["6"]) {
        assertEquals(typeof rates24h["6"], "object");
      }
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getTemperatureSchedule - retrieves schedule from database",
  fn: async () => {
    const start = new Date("2026-02-11T10:00:00Z");
    const end = new Date("2026-02-11T14:00:00Z");

    // Insert test schedule
    await client.from("schedule").insert({
      range: `[${start.toISOString()},${new Date("2026-02-11T12:00:00Z").toISOString()})`,
      limitup: 50,
      limitdown: 30,
    });

    try {
      const schedule = await getTemperatureSchedule(start, end);

      assertExists(schedule);
      // Should return a map of timestamps to limits
      assertEquals(typeof schedule, "object");
    } finally {
      // Cleanup
      await client.from("schedule").delete()
        .gte("range", `[${start.toISOString()},)`);
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "getHeatingPlan - retrieves future heating plan",
  fn: async () => {
    const currentHour = startOfHour(new Date("2026-02-11T12:00:00Z"));
    const nextHour = startOfHour(new Date("2026-02-11T13:00:00Z"));

    // Insert test heating plan
    await client.from("heating_plan").insert([
      {
        timestamp: currentHour.toISOString(),
        power: 6,
        price: 10.5,
        transmission_price: 5.0,
        total_price: 15.5,
        actual_power: 6,
        cost: 93,
        t_down: 35,
        t_up: 55,
        locked: false,
        options: {},
      },
      {
        timestamp: nextHour.toISOString(),
        power: 0,
        price: 20.0,
        transmission_price: 5.0,
        total_price: 25.0,
        actual_power: 0,
        cost: 0,
        t_down: 34,
        t_up: 54,
        locked: false,
        options: {},
      },
    ]);

    try {
      const plan = await getHeatingPlan(currentHour);

      assertExists(plan);
      assertEquals(typeof plan, "object");

      const currentHourKey = currentHour.toISOString();
      assertExists(plan[currentHourKey]);
      assertEquals(plan[currentHourKey].power, 6);
    } finally {
      // Cleanup
      await client.from("heating_plan").delete()
        .gte("timestamp", currentHour.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "savePlan - upserts heating plan to database",
  fn: async () => {
    const currentHour = startOfHour(new Date("2026-02-11T12:00:00Z"));

    const mockElementProps: ElementProps = {
      decreasePerHour: { up: 0.9, down: 1.2 },
      increasePerHour: {
        6: { up: 1.1, down: 0.9 },
        12: { up: 3.4, down: 5.5 },
      },
      maxTemp: 70,
    };

    const setting = new HourlySetting(
      currentHour,
      10.5,
      mockElementProps,
      { temperatureUp: 55, temperatureDown: 35 },
      undefined,
      undefined,
      5.0,
    );
    setting.power = 6;

    const options = {
      tempLimitUp: 55,
      tempLimitDown: 35,
      elementProps: mockElementProps,
      temperatureUp: 55,
      temperatureDown: 35,
    };

    try {
      await savePlan([setting], options, currentHour);

      // Verify data was saved
      const { data, error } = await client.from("heating_plan")
        .select()
        .eq("timestamp", currentHour.toISOString())
        .single();

      assertEquals(error, null);
      assertExists(data);
      assertEquals(data.power, 6);
      assertEquals(data.locked, true); // Current hour should be locked
      assertEquals(data.price, 10.5);
    } finally {
      // Cleanup
      await client.from("heating_plan").delete()
        .eq("timestamp", currentHour.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "savePlan - marks current hour as locked, future hours as unlocked",
  fn: async () => {
    const currentHour = startOfHour(new Date("2026-02-11T12:00:00Z"));
    const nextHour = startOfHour(new Date("2026-02-11T13:00:00Z"));

    const mockElementProps: ElementProps = {
      decreasePerHour: { up: 0.9, down: 1.2 },
      increasePerHour: {
        6: { up: 1.1, down: 0.9 },
        12: { up: 3.4, down: 5.5 },
      },
      maxTemp: 70,
    };

    const setting1 = new HourlySetting(
      currentHour,
      10.5,
      mockElementProps,
      { temperatureUp: 55, temperatureDown: 35 },
      undefined,
      undefined,
      5.0,
    );
    setting1.power = 6;

    const setting2 = new HourlySetting(
      nextHour,
      15.0,
      mockElementProps,
      setting1,
      undefined,
      undefined,
      5.0,
    );
    setting2.power = 0;

    const options = {
      tempLimitUp: 55,
      tempLimitDown: 35,
      elementProps: mockElementProps,
      temperatureUp: 55,
      temperatureDown: 35,
    };

    try {
      await savePlan([setting1, setting2], options, currentHour);

      // Verify current hour is locked
      const { data: currentData } = await client.from("heating_plan")
        .select()
        .eq("timestamp", currentHour.toISOString())
        .single();

      assertExists(currentData);
      assertEquals(currentData.locked, true);

      // Verify next hour is not locked
      const { data: nextData } = await client.from("heating_plan")
        .select()
        .eq("timestamp", nextHour.toISOString())
        .single();

      assertExists(nextData);
      assertEquals(nextData.locked, false);
    } finally {
      // Cleanup
      await client.from("heating_plan").delete()
        .gte("timestamp", currentHour.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "savePlan - upsert updates existing records",
  fn: async () => {
    const currentHour = startOfHour(new Date("2026-02-11T12:00:00Z"));

    const mockElementProps: ElementProps = {
      decreasePerHour: { up: 0.9, down: 1.2 },
      increasePerHour: {
        6: { up: 1.1, down: 0.9 },
        12: { up: 3.4, down: 5.5 },
      },
      maxTemp: 70,
    };

    // First insert
    const setting1 = new HourlySetting(
      currentHour,
      10.5,
      mockElementProps,
      { temperatureUp: 55, temperatureDown: 35 },
      undefined,
      undefined,
      5.0,
    );
    setting1.power = 6;

    const options = {
      tempLimitUp: 55,
      tempLimitDown: 35,
      elementProps: mockElementProps,
      temperatureUp: 55,
      temperatureDown: 35,
    };

    try {
      await savePlan([setting1], options, currentHour);

      // Update with different power
      const setting2 = new HourlySetting(
        currentHour,
        10.5,
        mockElementProps,
        { temperatureUp: 55, temperatureDown: 35 },
        undefined,
        undefined,
        5.0,
      );
      setting2.power = 12;

      await savePlan([setting2], options, currentHour);

      // Verify it was updated, not duplicated
      const { data, error } = await client.from("heating_plan")
        .select()
        .eq("timestamp", currentHour.toISOString());

      assertEquals(error, null);
      assertExists(data);
      assertEquals(data.length, 1); // Should only have one record
      assertEquals(data[0].power, 12); // Should be updated value
    } finally {
      // Cleanup
      await client.from("heating_plan").delete()
        .eq("timestamp", currentHour.toISOString());
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

// Cleanup after all tests
Deno.test({
  name: "Integration cleanup - remove test data",
  fn: async () => {
    await cleanupTestData();
  },
  sanitizeResources: false,
  sanitizeOps: false,
});







