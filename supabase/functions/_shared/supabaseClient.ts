import {Database} from "./database.types.ts";
import { createClient } from "supabase";

export const client = createClient<Database>(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
