import * as R from "remeda";
import {type Duration, formatDuration, isSameHour, startOfHour} from "date-fns";
import {HourlySetting} from "./hourly-setting.ts";
import { client } from "supabaseClient"

export const DOWN = "101";
export const UP = "100";

export const RESISTOR_UP = "6";
export const RESISTOR_DOWN = "12";

export type Peripheral = typeof DOWN | typeof UP;

export const getHeatingPlan = async (currentHour = startOfHour(new Date())) => {
  const { data, error: fetchError } = await client
    .from("heating_plan")
    .select()
    .gte("timestamp", currentHour.toISOString());

  if (fetchError) {
    const error = new Error(fetchError.message);
    error.cause = fetchError.cause;
    throw error;
  }

  return R.mapToObj(
    data ?? [],
    (plan) => [new Date(plan.timestamp).toISOString(), plan],
  );
};

export const getTemperature = async (peripheral: Peripheral) => {
  return (await client.from("temperature").select(
    "temperature",
  ).eq("peripheral", peripheral).order("timestamp", { ascending: false }).limit(
    1,
  )).data?.at(0)?.temperature;
};

export const getDropRates = async (interval: Duration = { hours: 12 }) =>
  (await client.rpc("get_temperature_drop_rates", {
    interval_hours: formatDuration(interval, { format: ["hours"] }),
  }))
    .data
    ?.reduce<Record<string, number>>(
      (acc, { peripheral, drop_rate_per_hour }) => {
        return { ...acc, [peripheral]: drop_rate_per_hour };
      },
      {},
    );

export const getIncreaseRates = async (
  intervalHours: Duration = { hours: 24 },
) =>
  (await client.rpc("get_temperature_increase_rates", {
    interval_hours: formatDuration(intervalHours, { format: ["hours"] }),
  }))
    .data
    ?.reduce<Record<string, Record<string, number>>>(
      (acc, { peripheral, state, diff_per_hour }) => {
        return {
          ...acc,
          [state]: { ...acc[state], [peripheral]: diff_per_hour },
        };
      },
      { 6: {}, 12: {} },
    );

export const savePlan = async (settings: HourlySetting[], currentHour = startOfHour(new Date())) => {
  const {error: err} = await client.from("heating_plan").upsert(
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
    })),
  );

  if (err) {
    const error = new Error(err.message);
    error.cause = err.cause;
    throw error;
  }
}
