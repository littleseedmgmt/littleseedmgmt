#!/bin/bash
# Setup script for Vercel test environment
# Run this once to configure the test project

PROJECT_NAME="littleseedmgmt-test"

echo "Setting up environment variables for $PROJECT_NAME..."

# Test Supabase credentials
vercel env add NEXT_PUBLIC_SUPABASE_URL production --project $PROJECT_NAME <<< "https://xujjznrbtrkmvhfarpdt.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --project $PROJECT_NAME <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1amp6bnJidHJrbXZoZmFycGR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyNzYzMDUsImV4cCI6MjA4NDg1MjMwNX0.e6jBzzxuo2KxJK8QgmUDrxKkyIa9OyHWe9fOM4vj8U0"
vercel env add SUPABASE_SERVICE_ROLE_KEY production --project $PROJECT_NAME <<< "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1amp6bnJidHJrbXZoZmFycGR0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTI3NjMwNSwiZXhwIjoyMDg0ODUyMzA1fQ.n-m7lZZWi_gyNAjaKuaMfZocGGVENA7aDNpXXUu8gIY"

# App configuration
vercel env add NEXT_PUBLIC_APP_URL production --project $PROJECT_NAME <<< "https://test.littleseedmgmt.com"
vercel env add NEXT_PUBLIC_APP_NAME production --project $PROJECT_NAME <<< "LittleSeedMgmt"
vercel env add NEXT_PUBLIC_ENV_MODE production --project $PROJECT_NAME <<< "test"
vercel env add NEXT_PUBLIC_PROD_URL production --project $PROJECT_NAME <<< "https://app.littleseedmgmt.com"
vercel env add NEXT_PUBLIC_TEST_URL production --project $PROJECT_NAME <<< "https://test.littleseedmgmt.com"

echo "Done! Now deploy with: vercel --prod --project $PROJECT_NAME"
