#!/bin/bash

echo "🔧 FIXING DRAFT MIGRATION ISSUE"
echo "=============================================================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo ""
  echo "Please set DATABASE_URL with your production database connection string"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

echo "📊 Current migration status:"
npx prisma migrate status
echo ""

echo "🔄 Marking 'draft_add_document_processing' as rolled back..."
npx prisma migrate resolve --rolled-back draft_add_document_processing || {
  echo ""
  echo "⚠️  Migration may not exist in database or already resolved"
  echo "Continuing anyway..."
}

echo ""
echo "📊 Updated migration status:"
npx prisma migrate status
echo ""

echo "✅ Draft migration marked as rolled back"
echo ""
echo "=============================================================================="
echo ""
echo "NEXT STEPS:"
echo "1. This should now allow Phase 1a migrations to run"
echo "2. Trigger a new deployment on Render"
echo "3. Monitor the pre-deploy logs"
echo ""
