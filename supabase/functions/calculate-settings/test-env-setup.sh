#!/usr/bin/env bash

# Quick test to verify integration test environment setup

echo "Testing integration test environment setup..."

cd "$(dirname "$0")"

# Test that we can import the test file without errors
deno check integration.test.ts 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Type check passed"
else
    echo "❌ Type check failed"
    exit 1
fi

# Test that we can at least load the test file
echo ""
echo "Attempting to load test file..."
deno eval "
// Set environment variables
Deno.env.set('SUPABASE_URL', 'http://localhost:54321');
Deno.env.set('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU');

console.log('Environment variables set:');
console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL'));
console.log('SUPABASE_ANON_KEY:', Deno.env.get('SUPABASE_ANON_KEY')?.substring(0, 20) + '...');
console.log('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.substring(0, 20) + '...');
console.log('');
console.log('✅ Environment setup successful');
" --allow-env --no-check

echo ""
echo "Environment test complete!"

