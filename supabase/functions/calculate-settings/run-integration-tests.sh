#!/usr/bin/env bash

# Script to verify Supabase is running before integration tests

echo "🔍 Checking if Supabase is running..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed"
    echo "Install it with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if Supabase is running
if ! curl -s -f http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
    echo "❌ Supabase is not running on port 54321"
    echo ""
    echo "Start Supabase with:"
    echo "  cd /Users/tjjalava/Work/kattila/supabase"
    echo "  supabase start"
    echo ""
    exit 1
fi

echo "✅ Supabase is running"

# Check PostgreSQL connection (optional, don't fail if pg_isready not available)
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost -p 54322 -q; then
        echo "✅ PostgreSQL is ready"
    else
        echo "⚠️  PostgreSQL might not be ready on port 54322"
    fi
fi

echo ""
echo "🧪 Running integration tests..."
echo ""

# Set default environment variables for local Supabase
# These will be used if not already set in the environment
export SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0}"
export SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"

# Run the integration tests
cd "$(dirname "$0")"
deno task test:integration


