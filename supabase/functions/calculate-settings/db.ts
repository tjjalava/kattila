import * as R from "remeda";
import {
  type Duration,
  formatDuration,
  isSameHour,
  startOfHour,
} from "date-fns";
import {
  CalculateOptions,
  HourlySetting,
  HourState,
} from "./hourly-setting.ts";
import { client } from "supabaseClient";
import { Json } from "../_shared/database.types.ts";

export const DOWN = "101";
export const UP = "100";

export const RESISTOR_UP = "6";
export const RESISTOR_DOWN = "12";

export type Peripheral = typeof DOWN | typeof UP;

const db = <Ret>(fn: { data: Ret; error: Error | null }) => {
  if (fn.error) {
    const dbError = new Error(fn.error.message);
    dbError.cause = fn.error.cause;
    throw dbError;
  }
  return fn.data;
};

export const getTemperatureSchedule = async (
  start: Date,
  end: Date,
): Promise<Record<string, { limitup: number | null; limitdown: number | null }>> => {
  const data = db(
    await client.rpc("get_temperature_schedule", {
      start_time: startOfHour(start).toISOString(),
      end_time: startOfHour(end).toISOString(),
    }),
  );

  return R.mapToObj(
    data ?? [],
    ({ hour, ...limits }) => [new Date(hour).toISOString(), limits],
  );
};

export const getHeatingPlan = async (currentHour = startOfHour(new Date())) => {
  const data = db(
    await client
      .from("heating_plan")
      .select()
      .gte("timestamp", currentHour.toISOString()),
  );

  return R.mapToObj(
    data ?? [],
    (plan) => [new Date(plan.timestamp).toISOString(), plan],
  );
};

export const getTemperature = async (peripheral: Peripheral) => {
  return db(
    await client.from("temperature").select(
      "temperature",
    ).eq("peripheral", peripheral).order("timestamp", { ascending: false })
      .limit(
        1,
      ),
  )?.at(0)?.temperature;
};

export const getDropRates = async () =>
  db(
    await client.rpc("get_temperature_drop_rates"),
  )
    ?.reduce<Record<string, number>>(
      (acc, { peripheral, drop_rate_per_hour }) => {
        return { ...acc, [peripheral]: Math.max(0, drop_rate_per_hour) };
      },
      {},
    );

export const getIncreaseRates = async (
  intervalHours: Duration = { hours: 24 },
) =>
  db(
    await client.rpc("get_temperature_increase_rates", {
      interval_hours: formatDuration(intervalHours, { format: ["hours"] }),
    }),
  )
    ?.reduce<Record<string, Record<string, number>>>(
      (acc, { peripheral, state, diff_per_hour }) => {
        return {
          ...acc,
          [state]: { ...acc[state], [peripheral]: diff_per_hour },
        };
      },
      { 6: {}, 12: {} },
    );

export const savePlan = async (
  settings: HourlySetting[],
  options: CalculateOptions & HourState,
  currentHour = startOfHour(new Date()),
) => {
  db(
    await client.from("heating_plan").upsert(
      settings.map((s) => ({
        timestamp: s.timestamp.toISOString(),
        power: s.power,
        price: s.price,
        transmission_price: s.transmissionPrice,
        total_price: s.totalPrice,
        actual_power: s.actualPower,
        cost: s.cost,
        t_down: s.temperatureDown,
        t_up: s.temperatureUp,
        locked: isSameHour(s.timestamp, currentHour),
        updated_at: new Date().toISOString(),
        options: {
          isLowTempHour: s.isLowTempHour,
          flexPriceUsed: s.flexPriceUsed,
          scheduledLimitUp: s.scheduledLimitUp,
          scheduledLimitDown: s.scheduledLimitDown,
          // tempLimitUp/Down show the ACTUAL limits used in calculation
          tempLimitUp: s.scheduledLimitUp ?? (s.isLowTempHour || s.flexPriceUsed ? options.tempLimitUp - 5 : options.tempLimitUp),
          tempLimitDown: s.scheduledLimitDown ?? options.tempLimitDown,
        },
      })),
    ),
  );

  const currentSetting = settings[0];

  db(
    await client.from("heating_plan").update({
      options: {
        ...options,
        isLowTempHour: currentSetting.isLowTempHour,
        flexPriceUsed: currentSetting.flexPriceUsed,
        scheduledLimitUp: currentSetting.scheduledLimitUp,
        scheduledLimitDown: currentSetting.scheduledLimitDown,
        // tempLimitUp/Down show the ACTUAL limits used in calculation
        tempLimitUp: currentSetting.scheduledLimitUp ?? (
          currentSetting.isLowTempHour || currentSetting.flexPriceUsed
            ? options.tempLimitUp - 5
            : options.tempLimitUp
        ),
        tempLimitDown: currentSetting.scheduledLimitDown ?? options.tempLimitDown,
      } as unknown as Json,
    }).eq("timestamp", currentHour.toISOString()),
  );
};
