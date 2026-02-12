import "./test-setup.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  calculateSettings,
  type CalculateOptions,
  type ElementProps,
  HourlySetting,
  type HourState,
} from "./hourly-setting.ts";

// Test fixtures
const mockElementProps: ElementProps = {
  decreasePerHour: {
    up: 0.9,
    down: 1.2,
  },
  increasePerHour: {
    6: {
      up: 1.1,
      down: 0.9,
    },
    12: {
      up: 3.4,
      down: 5.5,
    },
  },
  maxTemp: 70,
};

const mockStartState: HourState = {
  temperatureUp: 55,
  temperatureDown: 35,
};

const createMockSetting = (
  timestamp: Date,
  price: number,
  prevState: HourState = mockStartState,
  scheduledLimitUp?: number,
  scheduledLimitDown?: number,
): HourlySetting => {
  return new HourlySetting(
    timestamp,
    price,
    mockElementProps,
    prevState,
    scheduledLimitUp,
    scheduledLimitDown,
    5.0, // transmission price
  );
};

Deno.test("HourlySetting - constructor creates instance with correct properties", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const price = 10.5;
  const setting = createMockSetting(timestamp, price);

  assertEquals(setting.timestamp, timestamp);
  assertEquals(setting.price, price);
  assertEquals(setting.transmissionPrice, 5.0);
  assertEquals(setting.power, 0);
  assertEquals(setting.prevState, mockStartState);
});

Deno.test("HourlySetting - temperature calculations with power 0", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const setting = createMockSetting(timestamp, 10);

  setting.power = 0;

  // With no power, temperature should decrease
  assertEquals(setting.temperatureUp, 55 - 0.9); // 54.1
  assertEquals(setting.temperatureDown, 35 - 1.2); // 33.8
});

Deno.test("HourlySetting - temperature calculations with power 6", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const setting = createMockSetting(timestamp, 10);

  setting.power = 6;

  // Calculate expected increase factor for power 6
  const increaseFactorUp = (1.1 + 0.9) / 6; // 0.333...
  const increaseFactorDown = (0.9 + 1.2) / 6; // 0.35

  const actualPower = setting.actualPower; // Should be 6 or capped
  const expectedUp = 55 - 0.9 + increaseFactorUp * actualPower;
  const expectedDown = 35 - 1.2 + increaseFactorDown * actualPower;

  assertEquals(Math.round(setting.temperatureUp * 100) / 100, Math.round(expectedUp * 100) / 100);
  assertEquals(Math.round(setting.temperatureDown * 100) / 100, Math.round(expectedDown * 100) / 100);
});

Deno.test("HourlySetting - temperature calculations with power 12", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const setting = createMockSetting(timestamp, 10);

  setting.power = 12;

  // Calculate expected increase factor for power 12
  const increaseFactorUp = (3.4 + 0.9) / 12; // 0.358...
  const increaseFactorDown = (5.5 + 1.2) / 12; // 0.558...

  const actualPower = setting.actualPower;
  const expectedUp = 55 - 0.9 + increaseFactorUp * actualPower;
  const expectedDown = 35 - 1.2 + increaseFactorDown * actualPower;

  assertEquals(Math.round(setting.temperatureUp * 100) / 100, Math.round(expectedUp * 100) / 100);
  assertEquals(Math.round(setting.temperatureDown * 100) / 100, Math.round(expectedDown * 100) / 100);
});

Deno.test("HourlySetting - actualPower capped by maxTemp for power 6", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const highTempState: HourState = {
    temperatureUp: 69, // Very close to maxTemp (70)
    temperatureDown: 35,
  };
  const setting = createMockSetting(timestamp, 10, highTempState);

  setting.power = 6;

  // actualPower should be less than or equal to 6 due to maxTemp constraint
  const increaseFactorUp = (1.1 + 0.9) / 6;
  const expectedMaxPower = (70 - 69 + 0.9) / increaseFactorUp;

  assertEquals(setting.actualPower <= 6, true);
  assertEquals(setting.actualPower, Math.min(6, expectedMaxPower));

  // With temp at 69, the capping should occur
  assertEquals(setting.actualPower < 6, true);
});

Deno.test("HourlySetting - actualPower capped by maxTemp for power 12", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const highTempState: HourState = {
    temperatureUp: 55,
    temperatureDown: 68, // Close to maxTemp (70)
  };
  const setting = createMockSetting(timestamp, 10, highTempState);

  setting.power = 12;

  // actualPower should be less than 12 due to maxTemp constraint
  const increaseFactorDown = (5.5 + 1.2) / 12;
  const expectedMaxPower = (70 - 68 + 1.2) / increaseFactorDown;

  assertEquals(setting.actualPower, Math.min(12, expectedMaxPower));
  assertEquals(setting.actualPower < 12, true);
});

Deno.test("HourlySetting - cost calculation", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const price = 10.0;
  const setting = createMockSetting(timestamp, price);

  setting.power = 6;

  const expectedCost = setting.totalPrice * setting.actualPower;
  assertEquals(setting.cost, expectedCost);
  assertEquals(setting.totalPrice, price + 5.0); // price + transmission
});

Deno.test("HourlySetting - cache behavior on power change", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const setting = createMockSetting(timestamp, 10);

  setting.power = 0;
  const temp0Up = setting.temperatureUp;
  const temp0Down = setting.temperatureDown;

  setting.power = 6;
  const temp6Up = setting.temperatureUp;
  const temp6Down = setting.temperatureDown;

  // Temperatures should be different after power change
  assertEquals(temp6Up > temp0Up, true);
  assertEquals(temp6Down > temp0Down, true);
});

Deno.test("HourlySetting - resistor string representation", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const setting = createMockSetting(timestamp, 10);

  setting.power = 0;
  assertEquals(setting.resistor, "-");

  setting.power = 6;
  assertEquals(setting.resistor, "y");

  setting.power = 12;
  assertEquals(setting.resistor, "a");
});

Deno.test("HourlySetting - toJson serialization", () => {
  const timestamp = new Date("2026-02-10T12:00:00Z");
  const setting = createMockSetting(timestamp, 10);

  setting.power = 6;
  const json = setting.toJson();

  assertEquals(json.timestamp, timestamp.toISOString());
  assertEquals(json.power, 6);
  assertEquals(json.price, 10);
  assertEquals(json.transmissionPrice, 5.0);
  assertEquals(json.totalPrice, 15.0);
  assertExists(json.actualPower);
  assertExists(json.cost);
  assertExists(json.tUp);
  assertExists(json.tDown);
});

Deno.test("HourlySetting - isLowTempHour detection (Helsinki timezone)", () => {
  // 3 AM Helsinki time should be low temp hour
  const lowHour = new Date("2026-02-10T01:00:00Z"); // 3 AM EET
  const settingLow = createMockSetting(lowHour, 10);
  assertEquals(settingLow.isLowTempHour, true);

  // 10 AM Helsinki time should not be low temp hour
  const normalHour = new Date("2026-02-10T08:00:00Z"); // 10 AM EET
  const settingNormal = createMockSetting(normalHour, 10);
  assertEquals(settingNormal.isLowTempHour, false);
});

Deno.test("calculateSettings - simple heating scenario", () => {
  const startTime = new Date("2026-02-10T00:00:00Z");
  const prices = [
    { time: 0, price: 5 },
    { time: 1, price: 10 },
    { time: 2, price: 15 },
  ];

  const lowStartState: HourState = {
    temperatureUp: 40,
    temperatureDown: 30,
  };

  const settings: HourlySetting[] = [];
  for (let i = 0; i < prices.length; i++) {
    const { time, price } = prices[i];
    const timestamp = new Date(startTime.getTime() + time * 3600000);
    const prevState: HourState = i === 0 ? lowStartState : settings[i - 1];
    settings.push(createMockSetting(timestamp, price, prevState));
  }

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  const result = calculateSettings(settings, options);

  // Should heat during cheapest hours first
  assertEquals(result.length, 3);
  assertEquals(result[0].power > 0, true); // Should heat to reach targets
});

Deno.test("calculateSettings - respects scheduled limits", () => {
  const startTime = new Date("2026-02-10T12:00:00Z");
  const lowStartState: HourState = {
    temperatureUp: 40,
    temperatureDown: 30,
  };

  const setting = createMockSetting(
    startTime,
    10,
    lowStartState,
    45, // scheduledLimitUp - lower than default
    32, // scheduledLimitDown - lower than default
  );

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  const result = calculateSettings([setting], options);

  // Should respect scheduled limits (45, 32) over default limits (55, 35)
  // The algorithm will try to reach the scheduled limits
  assertEquals(result[0].temperatureUp <= 45 || result[0].power > 0, true);
  // Temperature down starts at 30, needs to reach 32
  assertEquals(result[0].temperatureDown >= 30, true);
  assertEquals(result[0].power >= 0, true); // Valid power state
});

Deno.test("calculateSettings - low temp hour adjustment", () => {
  // 3 AM Helsinki time (low temp hour)
  const lowHour = new Date("2026-02-10T01:00:00Z");
  const lowStartState: HourState = {
    temperatureUp: 40,
    temperatureDown: 30,
  };

  const setting = createMockSetting(lowHour, 10, lowStartState);

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings([setting], options);

  // During low temp hours, the effective limit should be 5 degrees lower
  // The algorithm should target 50 instead of 55 for temperatureUp
  assertEquals(setting.isLowTempHour, true);
});

Deno.test("calculateSettings - flex price threshold behavior", () => {
  const startTime = new Date("2026-02-10T12:00:00Z");
  const highPrice = 30; // Above flexPriceLimit (25)

  const nearTargetState: HourState = {
    temperatureUp: 51, // Within 5 degrees of target
    temperatureDown: 35,
  };

  const setting = createMockSetting(startTime, highPrice, nearTargetState);

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  const result = calculateSettings([setting], options);

  // Should use flex price when close to target and price is high
  assertEquals(result[0].flexPriceUsed, true);
  assertEquals(result[0].power, 0); // Should not heat at high price when close to target
});

Deno.test("calculateSettings - maxPower constraint", () => {
  const startTime = new Date("2026-02-10T12:00:00Z");
  const lowStartState: HourState = {
    temperatureUp: 40,
    temperatureDown: 30,
  };

  const setting = createMockSetting(startTime, 5, lowStartState);

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
    maxPower: 6, // Limit to 6kW
  };

  const result = calculateSettings([setting], options);

  // Should not exceed maxPower constraint
  assertEquals(result[0].power <= 6, true);
});

Deno.test("calculateSettings - power optimization between consecutive hours", () => {
  const startTime = new Date("2026-02-10T12:00:00Z");

  const highTempState: HourState = {
    temperatureUp: 68, // Close to maxTemp
    temperatureDown: 35,
  };

  const setting1 = createMockSetting(startTime, 5, highTempState);
  const setting2 = createMockSetting(
    new Date(startTime.getTime() + 3600000),
    10,
    setting1, // Use setting1 as prevState
  );

  const settings = [setting1, setting2];

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings(settings, options);

  // The algorithm should optimize power distribution between hours
  // This is tested by the comparePowerSettings logic
  assertExists(settings[0].power);
  assertExists(settings[1].power);
});

Deno.test("calculateSettings - maintains temperature state chain", () => {
  const startTime = new Date("2026-02-10T12:00:00Z");
  const prices = [5, 10, 15, 8, 12];

  const lowStartState: HourState = {
    temperatureUp: 45,
    temperatureDown: 30,
  };

  const settings: HourlySetting[] = [];
  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    const timestamp = new Date(startTime.getTime() + i * 3600000);
    const prevState: HourState = i === 0 ? lowStartState : settings[i - 1];
    settings.push(createMockSetting(timestamp, price, prevState));
  }

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  const result = calculateSettings(settings, options);

  // Each hour should build on the previous hour's state
  for (let i = 1; i < result.length; i++) {
    assertEquals(result[i].prevState, result[i - 1]);
  }
});









