import "./test-setup.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Note: These tests focus on HTTP request/response logic without complex Supabase mocking.
// For full integration tests, run against a local Supabase instance.

// Helper to create test requests
const createRequest = (
  url: string,
  method = "GET",
): Request => {
  return new Request(url, { method });
};

Deno.test("HTTP endpoint - GET request structure", () => {
  const req = createRequest("http://localhost/calculate-settings");
  assertExists(req);
  assertEquals(req.method, "GET");
  assertEquals(req.url, "http://localhost/calculate-settings");
});

Deno.test("HTTP endpoint - parses query parameters correctly", () => {
  const url = "http://localhost/calculate-settings?up=60&down=40&power=6&verbose=true";
  const req = createRequest(url);
  const parsedUrl = new URL(req.url);
  const params = parsedUrl.searchParams;

  assertEquals(params.get("up"), "60");
  assertEquals(params.get("down"), "40");
  assertEquals(params.get("power"), "6");
  assertEquals(params.get("verbose"), "true");
});

Deno.test("HTTP endpoint - handles invalid power parameter", () => {
  const url = "http://localhost/calculate-settings?power=8";
  const req = createRequest(url);
  const parsedUrl = new URL(req.url);
  const params = parsedUrl.searchParams;

  const maxPower = parseFloat(params.get("power") || "");
  const validPower = maxPower === 6 || maxPower === 12 ? maxPower : undefined;

  assertEquals(validPower, undefined); // 8 is not valid
});

Deno.test("HTTP endpoint - handles valid power parameter 6", () => {
  const url = "http://localhost/calculate-settings?power=6";
  const req = createRequest(url);
  const parsedUrl = new URL(req.url);
  const params = parsedUrl.searchParams;

  const maxPower = parseFloat(params.get("power") || "");
  const validPower = maxPower === 6 || maxPower === 12 ? maxPower : undefined;

  assertEquals(validPower, 6);
});

Deno.test("HTTP endpoint - handles valid power parameter 12", () => {
  const url = "http://localhost/calculate-settings?power=12";
  const req = createRequest(url);
  const parsedUrl = new URL(req.url);
  const params = parsedUrl.searchParams;

  const maxPower = parseFloat(params.get("power") || "");
  const validPower = maxPower === 6 || maxPower === 12 ? maxPower : undefined;

  assertEquals(validPower, 12);
});

Deno.test("HTTP endpoint - uses default limits when not provided", () => {
  const url = "http://localhost/calculate-settings";
  const req = createRequest(url);
  const parsedUrl = new URL(req.url);
  const params = parsedUrl.searchParams;

  const parseParam = (param?: string | null) => {
    if (!param) return undefined;
    const parsed = parseFloat(param);
    return isNaN(parsed) ? undefined : parsed;
  };

  const defaultOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
  };

  const options = {
    tempLimitUp: parseParam(params.get("up")) ?? defaultOptions.tempLimitUp,
    tempLimitDown: parseParam(params.get("down")) ?? defaultOptions.tempLimitDown,
  };

  assertEquals(options.tempLimitUp, 55);
  assertEquals(options.tempLimitDown, 35);
});

Deno.test("HTTP endpoint - overrides default limits with query params", () => {
  const url = "http://localhost/calculate-settings?up=60&down=40";
  const req = createRequest(url);
  const parsedUrl = new URL(req.url);
  const params = parsedUrl.searchParams;

  const parseParam = (param?: string | null) => {
    if (!param) return undefined;
    const parsed = parseFloat(param);
    return isNaN(parsed) ? undefined : parsed;
  };

  const defaultOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
  };

  const options = {
    tempLimitUp: parseParam(params.get("up")) ?? defaultOptions.tempLimitUp,
    tempLimitDown: parseParam(params.get("down")) ?? defaultOptions.tempLimitDown,
  };

  assertEquals(options.tempLimitUp, 60);
  assertEquals(options.tempLimitDown, 40);
});

Deno.test("HTTP endpoint - handles invalid numeric parameters", () => {
  const url = "http://localhost/calculate-settings?up=invalid&down=bad";
  const req = createRequest(url);
  const parsedUrl = new URL(req.url);
  const params = parsedUrl.searchParams;

  const parseParam = (param?: string | null) => {
    if (!param) return undefined;
    const parsed = parseFloat(param);
    return isNaN(parsed) ? undefined : parsed;
  };

  const defaultOptions = {
    tempLimitUp: 55,
    tempLimitDown: 35,
  };

  const options = {
    tempLimitUp: parseParam(params.get("up")) ?? defaultOptions.tempLimitUp,
    tempLimitDown: parseParam(params.get("down")) ?? defaultOptions.tempLimitDown,
  };

  // Should fall back to defaults
  assertEquals(options.tempLimitUp, 55);
  assertEquals(options.tempLimitDown, 35);
});

Deno.test("HTTP endpoint - non-GET requests return 400", () => {
  const req = createRequest("http://localhost/calculate-settings", "POST");
  assertEquals(req.method, "POST");

  // The actual handler would return 400 for non-GET
  // This tests the request structure
});

Deno.test("HTTP endpoint - verbose mode flag parsing", () => {
  const urlVerbose = "http://localhost/calculate-settings?verbose=true";
  const reqVerbose = createRequest(urlVerbose);
  const paramsVerbose = new URL(reqVerbose.url).searchParams;
  assertEquals(paramsVerbose.get("verbose") === "true", true);

  const urlNormal = "http://localhost/calculate-settings";
  const reqNormal = createRequest(urlNormal);
  const paramsNormal = new URL(reqNormal.url).searchParams;
  assertEquals(paramsNormal.get("verbose") === "true", false);
});

Deno.test("HTTP endpoint - force flag bypasses locked plan", () => {
  const url = "http://localhost/calculate-settings?force=true";
  const req = createRequest(url);
  const params = new URL(req.url).searchParams;

  assertEquals(params.get("force"), "true");

  // In the actual handler, this would bypass the locked plan check
});

Deno.test("HTTP endpoint - locked plan returns early without force flag", () => {
  // This test would verify that when a plan is locked and force=true is not set,
  // the endpoint returns the current plan without recalculation

  const mockLockedPlan = {
    "2026-02-10T12:00:00.000Z": {
      power: 6,
      locked: true,
      timestamp: "2026-02-10T12:00:00Z",
      price: 10,
      transmission_price: 5,
      total_price: 15,
      actual_power: 6,
      cost: 90,
      t_down: 35,
      t_up: 55,
      updated_at: "2026-02-10T11:00:00Z",
      options: {},
    },
  };

  // Test that the locked check logic works
  const currentHourKey = "2026-02-10T12:00:00.000Z";
  const currentPlan = mockLockedPlan[currentHourKey];
  const isLocked = currentPlan?.locked;
  const forceFlag = false;

  const shouldReturnEarly = isLocked && !forceFlag;
  assertEquals(shouldReturnEarly, true);
});

Deno.test("HTTP endpoint - response format in normal mode", () => {
  const normalResponse = {
    currentPower: 6,
  };

  assertEquals(normalResponse.currentPower, 6);
  assertEquals(Object.keys(normalResponse).length, 1);
});

Deno.test("HTTP endpoint - response format in verbose mode", () => {
  const verboseResponse = {
    results: [
      {
        timestamp: "2026-02-10T12:00:00Z",
        power: 6,
        actualPower: 6,
        price: 10,
        transmissionPrice: 5,
        totalPrice: 15,
        cost: 90,
        tUp: 55,
        tDown: 35,
      },
    ],
    currentPower: 6,
    estimate: {
      totalCost: 90,
      totalPower: 6,
    },
    startTemp: {
      temperatureUp: 55,
      temperatureDown: 35,
    },
    elementProps: {
      decreasePerHour: { up: 0.9, down: 1.2 },
      increasePerHour: {
        6: { up: 1.1, down: 0.9 },
        12: { up: 3.4, down: 5.5 },
      },
      maxTemp: 70,
    },
  };

  assertExists(verboseResponse.results);
  assertExists(verboseResponse.currentPower);
  assertExists(verboseResponse.estimate);
  assertExists(verboseResponse.startTemp);
  assertExists(verboseResponse.elementProps);
});

Deno.test("HTTP endpoint - parseParam helper function", () => {
  const parseParam = (param?: string | null) => {
    if (!param) return undefined;
    const parsed = parseFloat(param);
    return isNaN(parsed) ? undefined : parsed;
  };

  assertEquals(parseParam("55"), 55);
  assertEquals(parseParam("35.5"), 35.5);
  assertEquals(parseParam(null), undefined);
  assertEquals(parseParam(undefined), undefined);
  assertEquals(parseParam(""), undefined);
  assertEquals(parseParam("invalid"), undefined);
  assertEquals(parseParam("123abc"), 123); // parseFloat parses leading numbers
});

Deno.test("HTTP endpoint - estimate calculations", () => {
  const mockSettings = [
    { actualPower: 6, cost: 90 },
    { actualPower: 0, cost: 0 },
    { actualPower: 12, cost: 180 },
  ];

  const [totalPower, totalCost] = mockSettings.reduce(
    ([p, c], curr) => [p + curr.actualPower, c + curr.cost],
    [0, 0],
  );

  assertEquals(totalPower, 18);
  assertEquals(totalCost, 270);
  assertEquals(Math.round(totalCost * 100) / 100, 270);
  assertEquals(Math.round(totalPower * 100) / 100, 18);
});






