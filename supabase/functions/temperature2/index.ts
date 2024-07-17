// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2'

type Measurement = {
  peripheral: string;
  temperature: number;
}

Deno.serve(async (req) => {
  if (req.method === 'POST') {
    const body = (await req.json()) as Array<Measurement>

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    for (const { peripheral, temperature } of body) {
      if (!isNaN(temperature)) {
        const {error} = await supabase.from('temperature').insert({
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
