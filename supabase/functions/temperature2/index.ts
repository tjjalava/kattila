import "edge-runtime";
import { client } from "supabaseClient"

type Measurement = {
  peripheral: string;
  temperature: number;
}

Deno.serve(async (req) => {
  if (req.method === 'POST') {
    const body = (await req.json()) as Array<Measurement>

    for (const { peripheral, temperature } of body) {
      if (!isNaN(temperature)) {
        const {error} = await client.from('temperature').insert({
          peripheral,
          temperature,
        })

        if (error) {
          return new Response(error.message, {status: 500})
        }
      }
    }

    return new Response(null, {status: 202})
  }

  return new Response(null, {status: 400})
})
