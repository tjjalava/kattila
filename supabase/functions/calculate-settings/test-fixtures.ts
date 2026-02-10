/**
 * Shared test fixtures and utilities for calculate-settings tests
 */

import type { ElementProps, HourState } from "./hourly-setting.ts";

export const MOCK_ELEMENT_PROPS: ElementProps = {
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

export const MOCK_START_STATE: HourState = {
  temperatureUp: 55,
  temperatureDown: 35,
};

export const MOCK_LOW_START_STATE: HourState = {
  temperatureUp: 40,
  temperatureDown: 30,
};

export const MOCK_HIGH_START_STATE: HourState = {
  temperatureUp: 68,
  temperatureDown: 65,
};

export const MOCK_PRICES = [
  { price: 5.0, startDate: new Date("2026-02-10T00:00:00Z") },
  { price: 8.0, startDate: new Date("2026-02-10T01:00:00Z") },
  { price: 12.0, startDate: new Date("2026-02-10T02:00:00Z") },
  { price: 15.0, startDate: new Date("2026-02-10T03:00:00Z") },
  { price: 10.0, startDate: new Date("2026-02-10T04:00:00Z") },
  { price: 7.0, startDate: new Date("2026-02-10T05:00:00Z") },
  { price: 20.0, startDate: new Date("2026-02-10T06:00:00Z") },
  { price: 25.0, startDate: new Date("2026-02-10T07:00:00Z") },
  { price: 22.0, startDate: new Date("2026-02-10T08:00:00Z") },
  { price: 18.0, startDate: new Date("2026-02-10T09:00:00Z") },
  { price: 16.0, startDate: new Date("2026-02-10T10:00:00Z") },
  { price: 14.0, startDate: new Date("2026-02-10T11:00:00Z") },
  { price: 13.0, startDate: new Date("2026-02-10T12:00:00Z") },
];

export const MOCK_TEMPERATURE_DATA = [
  { peripheral: "100", temperature: 55, timestamp: "2026-02-10T12:00:00Z" },
  { peripheral: "101", temperature: 35, timestamp: "2026-02-10T12:00:00Z" },
];

export const MOCK_DROP_RATES = [
  { peripheral: "100", drop_rate_per_hour: 0.9 },
  { peripheral: "101", drop_rate_per_hour: 1.2 },
];

export const MOCK_INCREASE_RATES = [
  { peripheral: "100", state: "6", diff_per_hour: 1.1 },
  { peripheral: "101", state: "6", diff_per_hour: 0.9 },
  { peripheral: "100", state: "12", diff_per_hour: 3.4 },
  { peripheral: "101", state: "12", diff_per_hour: 5.5 },
];

export const MOCK_SCHEDULE_DATA = [
  {
    hour: "2026-02-10T12:00:00Z",
    limitup: 50,
    limitdown: 30,
  },
  {
    hour: "2026-02-10T13:00:00Z",
    limitup: 55,
    limitdown: 35,
  },
  {
    hour: "2026-02-10T14:00:00Z",
    limitup: null,
    limitdown: null,
  },
];

export const MOCK_HEATING_PLAN = [
  {
    timestamp: "2026-02-10T12:00:00Z",
    power: 6,
    price: 10.5,
    transmission_price: 5.0,
    total_price: 15.5,
    actual_power: 6,
    cost: 93,
    t_down: 35,
    t_up: 55,
    locked: true,
    updated_at: "2026-02-10T11:00:00Z",
    options: {},
  },
  {
    timestamp: "2026-02-10T13:00:00Z",
    power: 0,
    price: 20.0,
    transmission_price: 5.0,
    total_price: 25.0,
    actual_power: 0,
    cost: 0,
    t_down: 34,
    t_up: 54,
    locked: false,
    updated_at: "2026-02-10T11:00:00Z",
    options: {},
  },
];

/**
 * Creates a sequence of hourly timestamps starting from a base time
 */
export const createHourlyTimestamps = (
  baseTime: Date,
  count: number,
): Date[] => {
  return Array.from({ length: count }, (_, i) => {
    return new Date(baseTime.getTime() + i * 3600000);
  });
};

/**
 * Rounds a number to specified decimal places
 */
export const roundTo = (value: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
};

/**
 * Creates a mock Supabase response with data
 */
export const mockSupabaseSuccess = <T>(data: T) => ({
  data,
  error: null,
});

/**
 * Creates a mock Supabase response with error
 */
export const mockSupabaseError = (message: string) => ({
  data: null,
  error: new Error(message),
});

/**
 * Default calculate options for testing
 */
export const DEFAULT_OPTIONS = {
  tempLimitUp: 55,
  tempLimitDown: 35,
};

/**
 * Helsinki timezone offset helpers for testing low-temp hours
 */
export const HELSINKI_LOW_TEMP_HOURS = {
  start: 0, // Midnight
  end: 6, // 6 AM
};

/**
 * Creates a date in Helsinki low-temp hour range
 */
export const createLowTempHourDate = (hour: number = 3): Date => {
  if (hour < 0 || hour >= 6) {
    throw new Error("Hour must be between 0 and 5 for low-temp hours");
  }
  // Create a date at the specified hour in EET/EEST (UTC+2/+3)
  // For testing, we use UTC-2 to simulate Helsinki time
  return new Date(`2026-02-10T0${hour - 2}:00:00Z`);
};

/**
 * Creates a date outside Helsinki low-temp hour range
 */
export const createNormalTempHourDate = (hour: number = 12): Date => {
  if (hour < 6 || hour >= 24) {
    throw new Error("Hour must be between 6 and 23 for normal hours");
  }
  return new Date(`2026-02-10T${String(hour - 2).padStart(2, "0")}:00:00Z`);
};

