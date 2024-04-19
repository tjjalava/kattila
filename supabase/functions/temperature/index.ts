// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'GET') {
    const query = new URL(req.url).searchParams
    const peripheral = query.get('peripheral')
    const temperature = parseFloat(query.get('temperature'))

    if (peripheral && !isNaN(temperature)) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      )

      const { error } = await supabase.from('temperature').insert({
        peripheral,
        temperature,
      })

      if (error) {
        return new Response(error.message, { status: 500 })
      }

      return new Response(`${temperature}`, {status: 202})
    }
  }

  return new Response(null, { status: 400 })
})
