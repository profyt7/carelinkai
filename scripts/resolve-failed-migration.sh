#!/bin/bash

# Migration Resolution Script for CareLinkAI
# This script resolves the failed migration: 20251208170953_add_assessments_incidents_fields
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
echo "⚠️  This script will mark the failed migration as rolled back:"
echo "   Migration: 20251208170953_add_assessments_incidents_fields"
echo ""
read -p "Do you want to proceed? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Operation cancelled by user"
  exit 1
fi

echo "🔄 Marking failed migration as rolled back..."
echo ""

# Resolve the failed migration
npx prisma migrate resolve --rolled-back "20251208170953_add_assessments_incidents_fields"

echo ""
echo "✅ Migration marked as rolled back successfully"
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
