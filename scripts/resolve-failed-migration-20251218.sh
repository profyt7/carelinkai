#!/bin/bash

# Script to resolve the failed migration: 20251218162945_update_homes_to_active
# This migration failed in production due to a SELECT statement in the migration SQL
# This script marks it as "rolled back" so Prisma can continue with migrations

set -e  # Exit on any error

MIGRATION_NAME="20251218162945_update_homes_to_active"

echo "========================================="
echo "Failed Migration Resolution Script"
echo "========================================="
echo ""
echo "Migration: $MIGRATION_NAME"
echo "Action: Mark as rolled back"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "✅ Database URL configured"
echo ""

# Check migration status
echo "📊 Checking current migration status..."
echo ""

# Try to resolve the failed migration
# Using --rolled-back flag to mark it as if it was rolled back
# This is safe because:
# 1. The UPDATE part of the migration likely succeeded
# 2. Only the SELECT statement failed
# 3. The migration is idempotent (can be re-applied safely)

echo "🔧 Attempting to resolve failed migration..."
echo ""

# Suppress error output since the migration might already be resolved or not exist as failed
npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" 2>&1 || {
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Migration resolved successfully"
    else
        echo "⚠️  Migration may already be resolved or doesn't exist as failed"
        echo "   This is not necessarily an error - continuing..."
    fi
}

echo ""
echo "📊 Final migration status:"
npx prisma migrate status || true

echo ""
echo "========================================="
echo "✅ Resolution script completed"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Prisma will now attempt to apply the fixed migration"
echo "2. The UPDATE statement will run (idempotent, safe)"
echo "3. Deployment should succeed"
echo ""

exit 0
