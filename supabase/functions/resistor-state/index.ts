import "edge-runtime";
import { client } from "supabaseClient"
import {z} from "zod";

const bodySchema = z.object({
  down: z.boolean(),
  up: z.boolean(),
})

Deno.serve(async (req) => {
  if (req.method === "POST") {
    try {
      const {down, up} = bodySchema.parse(await req.json());

      const temperatureDown = await client.from("temperature").select(
        "temperature",
      ).eq("peripheral", "101")
        .order("timestamp", {ascending: false}).limit(1);
      const temperatureUp = await client.from("temperature").select(
        "temperature",
      ).eq("peripheral", "100")
        .order("timestamp", {ascending: false}).limit(1);

      const {error} = await client.from("resistor_state").insert({
        down,
        up,
        down_temp: temperatureDown.data?.at(0)?.temperature ?? 0,
        up_temp: temperatureUp.data?.at(0)?.temperature ?? 0,
      });

      if (error) {
        return new Response(error.message, {status: 500})
      }

      return new Response(null, {status: 202})
    } catch (e: unknown) {
      return new Response(e instanceof Error ? e.message : String(Error), {status: 400})
    }
  }

  return new Response(null, {status: 405})

});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/resistor-state' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
