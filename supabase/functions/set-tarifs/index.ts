import "edge-runtime";
import { fetchLatestPrices, getTransmissionPrice } from "tarifs";
import { isEqual, startOfHour } from "date-fns";

const SHELLY_ENDPOINT = "https://shelly-100-eu.shelly.cloud/v2/user/pp-ltu/";

Deno.serve(async (req) => {
  if (req.method === "GET") {
    try {
      const now = startOfHour(new Date());
      const latestPrice = (await fetchLatestPrices()).find(({ startDate }) =>
        isEqual(startDate, now)
      );

      if (!latestPrice) {
        return new Response("No price found for the current hour", {
          status: 500,
        });
      }

      const transmissionPrice = getTransmissionPrice(now);

      const shellyToken = Deno.env.get("SHELLY_TOKEN");
      const shellyUrl = `${SHELLY_ENDPOINT}/${shellyToken}`;

      console.log(
        `Tariff at ${now.toISOString()}: ${latestPrice.price} + ${transmissionPrice} = ${
          latestPrice.price + transmissionPrice
        }`,
      );

      const body = {
        price: (latestPrice.price + transmissionPrice) / 100,
      }

      const shellyResponse = await fetch(shellyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!shellyResponse.ok) {
        return new Response("Shelly request failed", { status: 500 });
      }

      return new Response(JSON.stringify(body), { status: 201, headers: { "Content-Type": "application/json" } });
    } catch (error) {
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/set-tarifs' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
