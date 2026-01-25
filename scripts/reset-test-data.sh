#!/bin/bash
# ============================================
# RESET TEST ENVIRONMENT TO BASELINE
# ============================================
# Run this script anytime you want to start fresh.
#
# Usage:
#   ./scripts/reset-test-data.sh
#
# What this does:
#   1. Clears ALL data in the test database
#   2. Reloads the baseline dataset (schools, teachers, students, settings)
#   3. You're back to a clean slate for testing
# ============================================

set -e

echo "============================================"
echo "RESETTING TEST ENVIRONMENT TO BASELINE"
echo "============================================"
echo ""
echo "This will:"
echo "  - Delete ALL existing data (attendance, shifts, PTO, etc.)"
echo "  - Restore baseline data (schools, teachers, students)"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Running seed script..."
npx supabase db execute --file supabase/seed-real-data.sql

echo ""
echo "============================================"
echo "RESET COMPLETE!"
echo "============================================"
echo "Your test environment is now reset to baseline."
echo ""
