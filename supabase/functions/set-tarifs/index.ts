import "edge-runtime";
import {fetchLatestPricesQuarter, getTransmissionPrice} from "tarifs";
import {isEqual, roundToNearestMinutes} from "date-fns";

Deno.serve(async (req) => {
  if (req.method === "GET") {
    try {
      const now = roundToNearestMinutes(new Date(), { nearestTo: 15, roundingMethod: "floor" });
      const latestPrice = (await fetchLatestPricesQuarter()).find(({startDate}) => isEqual(startDate, now));
      if (!latestPrice) {
        return new Response("No price found for the current hour", {
          status: 500
        });
      }
      const transmissionPrice = await getTransmissionPrice(now);
      const shellyUrl = Deno.env.get("SHELLY_TARIFF_URL");
      if (!shellyUrl) {
        return new Response("SHELLY_TARIFF_URL is not set", {
          status: 500
        });
      }
      console.log(`Tariff at ${now.toISOString()}: ${latestPrice.price} + ${transmissionPrice} = ${latestPrice.price + transmissionPrice}`);
      const body = {
        price: (latestPrice.price + transmissionPrice) / 100
      };
      const shellyResponse = await fetch(shellyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!shellyResponse.ok) {
        console.error("Shelly request failed, status: ", shellyResponse.status);
      } else {
        console.log("Tariff set ok");
      }
      return shellyResponse;
    } catch (error) {
      return new Response(error instanceof Error ? error.message : String(error), {
        status: 500
      });
    }
  } else {
    return new Response(null, {
      status: 400
    });
  }
}); /* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/set-tarifs' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
