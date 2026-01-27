import { roundToNearestMinutes, startOfHour } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { z } from "zod";
import { client } from "./supabaseClient.ts";

const LATEST_PRICES_ENDPOINT_v1 =
  "https://api.porssisahko.net/v1/latest-prices.json";
const LATEST_PRICES_ENDPOINT_v2 =
  "https://api.porssisahko.net/v2/latest-prices.json";

const DISTRIBUTION_DAY_INTERVAL_START = 7;
const DISTRIBUTION_DAY_INTERVAL_END = 22;

// Cache for tariff rates to avoid repeated database queries
let tariffsCache: {
  ELECTRICITY_TAX: number;
  DISTRIBUTION_NIGHT_CHARGE: number;
  DISTRIBUTION_DAY_CHARGE: number;
  ENERGY_CHARGE: number;
} | null = null;

const pricesSchema = z.object({
  prices: z.array(z.object({
    price: z.number(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })),
});

// Fetch the latest tariff rates from the database
const fetchLatestTariffs = async () => {
  if (tariffsCache) {
    return tariffsCache;
  }

  const { data, error } = await client
    .from("electricity_tarifs")
    .select("type, rate_per_kwh, effective_from")
    .in("type", [
      "ELECTRICITY_TAX",
      "DISTRIBUTION_NIGHT_CHARGE",
      "DISTRIBUTION_DAY_CHARGE",
      "ENERGY_CHARGE",
    ])
    .order("effective_from", { ascending: false });

  if (error) {
    console.error("Error fetching tariffs:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    throw new Error("No tariff data found");
  }

  // Get the most recent rate for each type
  const latestTariffs = new Map<string, number>();
  for (const tariff of data) {
    if (!latestTariffs.has(tariff.type)) {
      latestTariffs.set(tariff.type, tariff.rate_per_kwh);
    }
  }

  tariffsCache = {
    ELECTRICITY_TAX: (latestTariffs.get("ELECTRICITY_TAX") ?? 0.0283) * 100,
    DISTRIBUTION_NIGHT_CHARGE:
      (latestTariffs.get("DISTRIBUTION_NIGHT_CHARGE") ??
        0.0137) * 100,
    DISTRIBUTION_DAY_CHARGE: (latestTariffs.get("DISTRIBUTION_DAY_CHARGE") ??
      0.0262) * 100,
    ENERGY_CHARGE: (latestTariffs.get("ENERGY_CHARGE") ?? 0.041) * 100,
  };

  return tariffsCache;
};

export const fetchLatestPrices = async () => {
  const response = await fetch(LATEST_PRICES_ENDPOINT_v1);
  const data = pricesSchema.parse(await response.json());
  const thisHour = startOfHour(new Date());
  return data.prices
    .map(({ price, startDate }) => ({
      price,
      startDate: new Date(startDate),
    }))
    .filter(({ startDate }) => startDate >= thisHour)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
};

export const fetchLatestPricesQuarter = async () => {
  const response = await fetch(LATEST_PRICES_ENDPOINT_v2);
  const data = pricesSchema.parse(await response.json());
  const thisQuart = roundToNearestMinutes(new Date(), {
    nearestTo: 15,
    roundingMethod: "floor",
  });
  return data.prices
    .map(({ price, startDate }) => ({
      price,
      startDate: new Date(startDate),
    }))
    .filter(({ startDate }) => startDate >= thisQuart)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
};

export const getTransmissionPrice = async (date = new Date()) => {
  const tariffs = await fetchLatestTariffs();
  const hour = new TZDate(date).withTimeZone("Europe/Helsinki").getHours();
  if (
    hour >= DISTRIBUTION_DAY_INTERVAL_START &&
    hour < DISTRIBUTION_DAY_INTERVAL_END
  ) {
    return tariffs.DISTRIBUTION_DAY_CHARGE + tariffs.ELECTRICITY_TAX;
  }
  return tariffs.DISTRIBUTION_NIGHT_CHARGE + tariffs.ELECTRICITY_TAX;
};
