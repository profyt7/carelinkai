#!/bin/bash

# Script to resolve the failed migration: 20251218162945_update_homes_to_active

set -e

echo "🔧 Resolving Failed Migration: update_homes_to_active"
echo "========================================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "Please set DATABASE_URL and try again."
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Show current migration status
echo "📊 Current Migration Status:"
echo "----------------------------"
npx prisma migrate status || true
echo ""

# Resolve the failed migration
echo "🔄 Marking migration as rolled back..."
echo ""

npx prisma migrate resolve --rolled-back 20251218162945_update_homes_to_active 2>&1 || {
  echo "⚠️  Migration may already be resolved or doesn't exist in failed state"
}

echo ""
echo "📊 Migration Status After Resolution:"
echo "--------------------------------------"
npx prisma migrate status || true
echo ""

echo "✅ Migration resolution complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npx prisma migrate deploy' to apply any pending migrations"
echo "2. Or let Render's automatic deployment handle it"
echo ""
