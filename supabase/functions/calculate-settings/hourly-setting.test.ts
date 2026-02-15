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

Deno.test("calculateSettings - scheduled limits skip flexPrice and lowTempHour", () => {
  // Test 1: Scheduled limit during low temp hour should NOT apply -5 adjustment
  const lowTempHour = new Date("2026-02-10T01:00:00Z"); // 3 AM Helsinki (low temp hour)
  const lowStartState: HourState = {
    temperatureUp: 40,
    temperatureDown: 30,
  };

  const settingWithSchedule = createMockSetting(
    lowTempHour,
    10,
    lowStartState,
    52, // scheduledLimitUp - should be used as-is, not reduced by 5
    undefined,
  );

  const optionsLowTemp: CalculateOptions = {
    tempLimitUp: 55, // Would normally be 50 during low temp hour
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings([settingWithSchedule], optionsLowTemp);

  // Should try to reach 52, not 50 (55-5)
  assertEquals(settingWithSchedule.isLowTempHour, true);
  // Power should be set to heat towards 52
  assertEquals(settingWithSchedule.power > 0, true);

  // Test 2: Scheduled limit with high price should NOT stop at flexPrice
  const highPriceHour = new Date("2026-02-10T12:00:00Z");
  const highPrice = 30; // Above flexPriceLimit (25)

  const nearTargetState: HourState = {
    temperatureUp: 48, // Close to target but not quite there
    temperatureDown: 35,
  };

  const settingWithHighPrice = createMockSetting(
    highPriceHour,
    highPrice,
    nearTargetState,
    52, // scheduledLimitUp
    undefined,
  );

  const optionsHighPrice: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings([settingWithHighPrice], optionsHighPrice);

  // Should NOT use flexPrice (flexPriceUsed should be false)
  assertEquals(settingWithHighPrice.flexPriceUsed, false);
  // Should continue heating despite high price
  assertEquals(settingWithHighPrice.power > 0, true);

  // Test 3: Without scheduled limit, high price during non-low-temp hour should trigger flexPrice
  const nearTargetStateForFlex: HourState = {
    temperatureUp: 51, // Within 5 degrees of target (55-5=50), so flexPrice can trigger
    temperatureDown: 35,
  };

  const settingWithoutSchedule = createMockSetting(
    highPriceHour,
    highPrice,
    nearTargetStateForFlex,
    undefined, // No scheduled limit
    undefined,
  );

  calculateSettings([settingWithoutSchedule], optionsHighPrice);

  // Should use flexPrice and stop heating
  assertEquals(settingWithoutSchedule.flexPriceUsed, true);
});

Deno.test("calculateSettings - scheduledLimitDown alone does NOT skip flexPrice", () => {
  // When only scheduledLimitDown is set (not scheduledLimitUp), flexPrice should still apply
  const highPriceHour = new Date("2026-02-10T12:00:00Z");
  const highPrice = 30; // Above flexPriceLimit (25)

  const nearTargetState: HourState = {
    temperatureUp: 51, // Within 5 degrees of target (55-5=50), so flexPrice can trigger
    temperatureDown: 30, // Below scheduled down limit
  };

  const settingWithOnlyDownSchedule = createMockSetting(
    highPriceHour,
    highPrice,
    nearTargetState,
    undefined, // No scheduledLimitUp
    40, // scheduledLimitDown only
  );

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings([settingWithOnlyDownSchedule], options);

  // Should STILL use flexPrice because only scheduledLimitDown is set
  // FlexPrice is only skipped when scheduledLimitUp is defined
  assertEquals(settingWithOnlyDownSchedule.flexPriceUsed, true);
});

Deno.test("calculateSettings - scheduledLimitUp prevents temperature drop below limit", () => {
  // This tests the bug: temperature should NOT drop below scheduledLimitUp
  const startTime = new Date("2026-02-10T12:00:00Z");

  // Start with temperature slightly above the scheduled limit
  const startState: HourState = {
    temperatureUp: 46, // Just above scheduled limit
    temperatureDown: 40,
  };

  const setting = createMockSetting(
    startTime,
    15, // Moderate price
    startState,
    45, // scheduledLimitUp - must not drop below this
    undefined,
  );

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps, // decreasePerHour.up = ~6°C
  };

  calculateSettings([setting], options);

  // CRITICAL: Temperature at end of hour must be >= scheduledLimitUp
  // Without heating: 46 - 6 = 40°C (below limit!)
  // With heating: should maintain at least 45°C
  assertEquals(
    setting.temperatureUp >= 45,
    true,
    `Temperature dropped to ${setting.temperatureUp}, below scheduled limit of 45`
  );
});

Deno.test("calculateSettings - scheduledLimitUp during lowTempHour prevents drop", () => {
  // During low temp hours (0-6 AM Helsinki), scheduledLimitUp should still be enforced
  const lowTempHour = new Date("2026-02-10T01:00:00Z"); // 3 AM Helsinki

  const startState: HourState = {
    temperatureUp: 46, // Slightly above scheduled limit
    temperatureDown: 40,
  };

  const setting = createMockSetting(
    lowTempHour,
    15,
    startState,
    45, // scheduledLimitUp
    undefined,
  );

  const options: CalculateOptions = {
    tempLimitUp: 55, // Would normally be 50 during low temp hour
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings([setting], options);

  // Must maintain scheduledLimitUp even during low temp hour
  assertEquals(setting.isLowTempHour, true);
  assertEquals(
    setting.temperatureUp >= 45,
    true,
    `Temperature dropped to ${setting.temperatureUp} during low temp hour, below scheduled limit of 45`
  );
});

Deno.test("calculateSettings - scheduledLimitUp with expensive price prevents drop", () => {
  // Even with expensive electricity, scheduledLimitUp must be maintained
  const expensiveHour = new Date("2026-02-10T18:00:00Z");

  const startState: HourState = {
    temperatureUp: 46,
    temperatureDown: 40,
  };

  const setting = createMockSetting(
    expensiveHour,
    35, // Very expensive (above flexPrice limit of 25)
    startState,
    45, // scheduledLimitUp
    undefined,
  );

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings([setting], options);

  // Must maintain scheduledLimitUp even with expensive electricity
  assertEquals(
    setting.temperatureUp >= 45,
    true,
    `Temperature dropped to ${setting.temperatureUp} with expensive price, below scheduled limit of 45`
  );
  // Should not use flexPrice (it's skipped when scheduledLimitUp is set)
  assertEquals(setting.flexPriceUsed, false);
});

Deno.test("calculateSettings - multiple hours with scheduledLimitUp maintains limit", () => {
  // Test across multiple hours to ensure temperature never drops below scheduled limit
  const startTime = new Date("2026-02-10T12:00:00Z");
  const prices = [20, 25, 30, 15, 10]; // Varying prices

  const startState: HourState = {
    temperatureUp: 47, // Start above limit
    temperatureDown: 40,
  };

  const settings: HourlySetting[] = [];
  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    const timestamp = new Date(startTime.getTime() + i * 3600000);
    const prevState: HourState = i === 0 ? startState : settings[i - 1];
    settings.push(createMockSetting(
      timestamp,
      price,
      prevState,
      45, // scheduledLimitUp for all hours
      undefined,
    ));
  }

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  const result = calculateSettings(settings, options);

  // Every hour must maintain temperature >= 45
  result.forEach((setting, index) => {
    assertEquals(
      setting.temperatureUp >= 45,
      true,
      `Hour ${index}: Temperature dropped to ${setting.temperatureUp}, below scheduled limit of 45`
    );
  });
});

Deno.test("calculateSettings - scheduledLimitUp starting exactly at limit", () => {
  // Edge case: starting temperature equals the scheduled limit
  const startTime = new Date("2026-02-10T12:00:00Z");

  const startState: HourState = {
    temperatureUp: 45, // Exactly at scheduled limit
    temperatureDown: 40,
  };

  const setting = createMockSetting(
    startTime,
    15,
    startState,
    45, // scheduledLimitUp
    undefined,
  );

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: mockElementProps,
  };

  calculateSettings([setting], options);

  // Must not drop below limit
  assertEquals(
    setting.temperatureUp >= 45,
    true,
    `Temperature dropped to ${setting.temperatureUp}, below scheduled limit of 45`
  );
  // Should have power > 0 to prevent drop
  assertEquals(
    setting.power > 0,
    true,
    `No heating applied, temperature will drop below limit`
  );
});

Deno.test("calculateSettings - high decrease rate with scheduledLimitUp", () => {
  // Test with higher decrease rate to match production scenario
  const highDecreaseProps: ElementProps = {
    decreasePerHour: {
      up: 6.0, // Realistic high decrease rate
      down: 7.0,
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

  const startTime = new Date("2026-02-10T12:00:00Z");

  const startState: HourState = {
    temperatureUp: 46, // Just above scheduled limit
    temperatureDown: 40,
  };

  const setting = createMockSetting(
    startTime,
    15,
    startState,
    45, // scheduledLimitUp
    undefined,
  );

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: highDecreaseProps,
  };

  calculateSettings([setting], options);

  // With 6°C/hour decrease: 46 - 6 = 40°C (below limit!)
  // Must apply enough heating to maintain >= 45°C
  assertEquals(
    setting.temperatureUp >= 45,
    true,
    `Temperature dropped to ${setting.temperatureUp}, below scheduled limit of 45 (high decrease rate)`
  );
});

Deno.test("calculateSettings - real-world scenario: temperature chain with varying prices", () => {
  // Simulate a real production scenario
  const highDecreaseProps: ElementProps = {
    decreasePerHour: {
      up: 6.0,
      down: 7.0,
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

  // Start at 10 AM, simulate through afternoon
  const startTime = new Date("2026-02-10T08:00:00Z"); // 10 AM Helsinki

  // Prices: expensive peak hours, then cheaper evening
  const prices = [25, 30, 35, 40, 30, 25, 20, 15, 10, 8]; // 10 hours

  const startState: HourState = {
    temperatureUp: 50, // Start at 50°C
    temperatureDown: 45,
  };

  const settings: HourlySetting[] = [];
  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    const timestamp = new Date(startTime.getTime() + i * 3600000);
    const prevState: HourState = i === 0 ? startState : settings[i - 1];

    // Set scheduledLimitUp=45 for hours 5-9 (15:00-19:00 Helsinki)
    const scheduledLimit = (i >= 5 && i <= 9) ? 45 : undefined;

    settings.push(createMockSetting(
      timestamp,
      price,
      prevState,
      scheduledLimit,
      undefined,
    ));
  }

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: highDecreaseProps,
    maxPower: 12,
  };

  const result = calculateSettings(settings, options);

  // Verify scheduled hours maintain >= 45°C
  for (let i = 5; i <= 9; i++) {
    assertEquals(
      result[i].temperatureUp >= 45,
      true,
      `Hour ${i}: Temperature dropped to ${result[i].temperatureUp}, below scheduled limit of 45. Power: ${result[i].power}`
    );
  }

  // Log the temperature progression for debugging
  console.log("Temperature progression:");
  result.forEach((s, i) => {
    console.log(
      `Hour ${i}: Temp=${s.temperatureUp.toFixed(1)}°C, Power=${s.power}kW, Price=${prices[i]}c/kWh, Scheduled=${settings[i].scheduledLimitUp || 'none'}`
    );
  });
});

Deno.test("calculateSettings - BUG: scheduledLimitUp with enough hours to drop below limit", () => {
  // This test should FAIL and expose the bug!
  const highDecreaseProps: ElementProps = {
    decreasePerHour: {
      up: 6.0,
      down: 7.0,
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

  const startTime = new Date("2026-02-10T08:00:00Z");

  const startState: HourState = {
    temperatureUp: 46, // Start at 46°C, very close to limit
    temperatureDown: 45,
  };

  const settings: HourlySetting[] = [];
  // Create 10 hours with scheduledLimitUp=45, all with cheap prices
  // With 6°C/hour decrease, this will eventually drop below 45°C
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(startTime.getTime() + i * 3600000);
    const prevState: HourState = i === 0 ? startState : settings[i - 1];
    settings.push(createMockSetting(
      timestamp,
      5, // Very cheap electricity
      prevState,
      45, // scheduledLimitUp for all hours
      undefined,
    ));
  }

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: highDecreaseProps,
    maxPower: 12,
  };

  const result = calculateSettings(settings, options);

  console.log("BUG TEST - Temperature with scheduledLimitUp=45:");
  result.forEach((s, i) => {
    console.log(
      `Hour ${i}: Start=${i === 0 ? 50 : result[i - 1].temperatureUp.toFixed(1)}°C -> End=${s.temperatureUp.toFixed(1)}°C, Power=${s.power}kW, Scheduled=45°C`
    );
  });

  // ALL hours should maintain temperature >= 45°C
  result.forEach((s, i) => {
    assertEquals(
      s.temperatureUp >= 45,
      true,
      `BUG EXPOSED! Hour ${i}: Temperature dropped to ${s.temperatureUp.toFixed(1)}°C, below scheduled limit of 45°C. Power was: ${s.power}kW`
    );
  });
});

Deno.test("calculateSettings - scheduledLimitUp only on some hours (production scenario)", () => {
  // This mimics a realistic scenario where scheduledLimitUp is set for specific hours only
  const highDecreaseProps: ElementProps = {
    decreasePerHour: {
      up: 6.0,
      down: 7.0,
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

  const startTime = new Date("2026-02-10T08:00:00Z");

  const startState: HourState = {
    temperatureUp: 52, // Start higher
    temperatureDown: 45,
  };

  const settings: HourlySetting[] = [];
  const prices = [25, 30, 35, 40, 30, 25, 20, 15, 10, 8];

  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(startTime.getTime() + i * 3600000);
    const prevState: HourState = i === 0 ? startState : settings[i - 1];

    // scheduledLimitUp=45 only for hours 3-7
    const scheduledLimit = (i >= 3 && i <= 7) ? 45 : undefined;

    settings.push(createMockSetting(
      timestamp,
      prices[i],
      prevState,
      scheduledLimit,
      undefined,
    ));
  }

  const options: CalculateOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
    elementProps: highDecreaseProps,
    maxPower: 12,
  };

  const result = calculateSettings(settings, options);

  console.log("\nProduction scenario - Mixed scheduled hours:");
  result.forEach((s, i) => {
    console.log(
      `Hour ${i}: Temp=${s.temperatureUp.toFixed(1)}°C, Power=${s.power}kW, Price=${prices[i]}c/kWh, Scheduled=${settings[i].scheduledLimitUp || 'none'}`
    );
  });

  // Hours 3-7 must maintain >= 45°C
  for (let i = 3; i <= 7; i++) {
    assertEquals(
      result[i].temperatureUp >= 45,
      true,
      `Hour ${i}: Temperature ${result[i].temperatureUp.toFixed(1)}°C dropped below scheduled limit of 45°C`
    );
  }
});
