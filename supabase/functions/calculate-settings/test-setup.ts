/**
 * Test setup and environment configuration
 * This file should be imported at the top of each test file
 *
 * Sets environment variables for local Supabase instance.
 * These are the default keys from `supabase start`.
 */

// Set required environment variables for testing
// These are the default local Supabase values - safe to commit
Deno.env.set("SUPABASE_URL", Deno.env.get("SUPABASE_URL") || "http://localhost:54321");
Deno.env.set("SUPABASE_ANON_KEY", Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU");

// Export for use in tests if needed
export const TEST_ENV = {
  SUPABASE_URL: Deno.env.get("SUPABASE_URL")!,
  SUPABASE_ANON_KEY: Deno.env.get("SUPABASE_ANON_KEY")!,
  SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
};

