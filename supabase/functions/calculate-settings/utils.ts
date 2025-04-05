import { startOfHour } from "npm:date-fns@4.1.0";
import { z } from "npm:zod";

const LATEST_PRICES_ENDPOINT =
  "https://api.porssisahko.net/v1/latest-prices.json";

const TRANSMISSION_TAX = 2.83
const TRANSMISSION_NIGHT = 1.37
const TRANSMISSION_DAY = 2.62
const TRANSMISSION_DAY_INTERVAL_START = 7
const TRANSMISSION_DAY_INTERVAL_END = 22

const pricesSchema = z.object({
  prices: z.array(z.object({
    price: z.number(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  })),
});

export const fetchLatestPrices = async () => {
  const response = await fetch(LATEST_PRICES_ENDPOINT);
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

export const getTransmissionPrice = (date: Date) => {
  const hour = date.getHours();
  if (hour >= TRANSMISSION_DAY_INTERVAL_START && hour < TRANSMISSION_DAY_INTERVAL_END) {
    return TRANSMISSION_DAY + TRANSMISSION_TAX;
  }
  return TRANSMISSION_NIGHT + TRANSMISSION_TAX;
}
