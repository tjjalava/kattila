import "edge-runtime";
import { startOfHour } from "date-fns";

import {
  calculateSettings,
  ElementProps,
  HourlySetting,
  HourState,
} from "./hourly-setting.ts";
import { fetchLatestPrices } from "tarifs";
import {
  DOWN,
  getDropRates,
  getHeatingPlan,
  getTemperature,
  RESISTOR_DOWN,
  RESISTOR_UP,
  savePlan,
  UP,
} from "./db.ts";

const elementPropTemplate: ElementProps = {
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

const defaultOptions = {
  tempLimitUp: 55,
  tempLimitDown: 35,
};

const parseParam = (param?: string | null) => {
  if (!param) {
    return undefined;
  }
  const parsed = parseFloat(param);
  if (isNaN(parsed)) {
    return undefined;
  }
  return parsed;
};

Deno.serve(async (req) => {
  if (req.method === "GET") {
    try {
      const url = new URL(req.url);
      const params = url.searchParams;
      const verbose = params.get("verbose") === "true";

      const options = {
        tempLimitUp: parseParam(params.get("up")) ?? defaultOptions.tempLimitUp,
        tempLimitDown: parseParam(params.get("down")) ??
          defaultOptions.tempLimitDown,
      };

      const currentHour = startOfHour(new Date());

      const storedPlan = await getHeatingPlan();
      const currentPlan = storedPlan[currentHour.toISOString()];

      if (currentPlan?.locked && params.get("force") !== "true") {
        return new Response(
          JSON.stringify({
            currentPower: currentPlan.power,
            ...(params.get("verbose") === "true" && { plan: storedPlan }),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }

      const startTemp: HourState = {
        temperatureUp: (await getTemperature(UP)) ?? 55,
        temperatureDown: (await getTemperature(DOWN)) ?? 35,
      };

      const dropRates = await getDropRates();

      const increaseRates = undefined; //await getIncreaseRates();

      const elementProps: ElementProps = {
        ...elementPropTemplate,
        increasePerHour: {
          6: {
            up: increaseRates?.[RESISTOR_UP][UP] ?? 3.8,
            down: increaseRates?.[RESISTOR_UP][DOWN] ?? 2.7,
          },
          12: {
            up: increaseRates?.[RESISTOR_DOWN][UP] ?? 3,
            down: increaseRates?.[RESISTOR_DOWN][DOWN] ?? 5.6,
          },
        },
        decreasePerHour: {
          up: dropRates?.[UP] ?? 1.2,
          down: dropRates?.[DOWN] ?? 1.2,
        },
      };

      const prices = await fetchLatestPrices();

      const settings = calculateSettings(
        prices.reduce<HourlySetting[]>(
          (
            acc,
            { price, startDate },
          ) => [
            ...acc,
            new HourlySetting(
              startDate,
              price,
              elementProps,
              acc[acc.length - 1] ?? startTemp,
            ),
          ],
          [],
        ),
        { ...options, elementProps },
      );
      const [totalPower, totalCost] = settings.reduce(([p, c], curr) => {
        return [p + curr.actualPower, c + curr.cost];
      }, [0, 0]);

      await savePlan(
        settings,
        { ...options, elementProps, ...startTemp },
        currentHour,
      );

      const response = verbose
        ? {
          results: settings.map((s) => s.toJson()),
          currentPower: settings[0].power,
          estimate: {
            totalCost: Math.round(totalCost * 100) / 100,
            totalPower: Math.round(totalPower * 100) / 100,
          },
          startTemp,
          elementProps,
        }
        : { currentPower: settings[0].power };

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.error(error);
      return new Response(
        error instanceof Error ? error.message : String(error),
        { status: 500 },
      );
    }
  } else {
    return new Response(null, { status: 400 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/calculate-settings' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
