#!/bin/bash

# Migration Resolution Script for CareLinkAI
# This script resolves BOTH failed migrations:
#   1. 20251208170953_add_assessments_incidents_fields
#   2. 20251208170953_add_assessments_incidents_fields.failed_backup
# Run this script on the production database before deploying the new migration

set -e  # Exit on error

echo "========================================"
echo "CareLinkAI Migration Resolution Script"
echo "========================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo "Please set DATABASE_URL before running this script"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Show current migration status
echo "📋 Current migration status:"
echo "----------------------------"
npx prisma migrate status || true
echo ""

# Ask for confirmation
echo "⚠️  This script will mark BOTH failed migrations as rolled back:"
echo "   Migration 1: 20251208170953_add_assessments_incidents_fields"
echo "   Migration 2: 20251208170953_add_assessments_incidents_fields.failed_backup"
echo ""
echo "ℹ️  Note: The .failed_backup migration was recorded in the database"
echo "   during a previous deployment attempt, even though the folder"
echo "   was removed from the codebase."
echo ""
read -p "Do you want to proceed? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Operation cancelled by user"
  exit 1
fi

echo "🔄 Resolving failed migrations..."
echo ""

# Resolve the original failed migration
echo "1️⃣  Resolving: 20251208170953_add_assessments_incidents_fields"
npx prisma migrate resolve --rolled-back "20251208170953_add_assessments_incidents_fields" || echo "⚠️  Migration 1 may already be resolved"

echo ""

# Resolve the backup failed migration
echo "2️⃣  Resolving: 20251208170953_add_assessments_incidents_fields.failed_backup"
npx prisma migrate resolve --rolled-back "20251208170953_add_assessments_incidents_fields.failed_backup" || echo "⚠️  Migration 2 may already be resolved"

echo ""
echo "✅ Both migrations marked as rolled back successfully"
echo ""

# Show updated migration status
echo "📋 Updated migration status:"
echo "----------------------------"
npx prisma migrate status || true
echo ""

echo "✅ Resolution complete!"
echo ""
echo "Next steps:"
echo "1. Deploy the new idempotent migration using: npm run migrate:deploy"
echo "2. Verify the migration succeeded"
echo "3. Test the application"
echo ""
echo "========================================"
