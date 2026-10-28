#!/bin/bash

# CareLinkAI - Migration Fix Script for Render Shell
# Copy and paste this entire script into Render Shell

echo "🔧 Fixing CareLinkAI Migration"
echo "=================================================================="
echo ""

# Step 1: Mark failed migration as rolled back
echo "Step 1: Marking failed migration as rolled back..."
npx prisma migrate resolve --rolled-back 20251218162945_update_homes_to_active

if [ $? -eq 0 ]; then
  echo "✅ Migration marked as rolled back"
else
  echo "⚠️  Migration may already be resolved (this is OK)"
fi

echo ""

# Step 2: Fix invalid status values
echo "Step 2: Fixing invalid status values in database..."
npx prisma db execute --stdin <<< "UPDATE \"AssistedLivingHome\" SET status = 'ACTIVE' WHERE status = '' OR status IS NULL;"

if [ $? -eq 0 ]; then
  echo "✅ Database records updated"
else
  echo "❌ Failed to update database records"
  exit 1
fi

echo ""

# Step 3: Deploy pending migrations
echo "Step 3: Deploying pending migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
  echo "✅ Migrations deployed successfully"
else
  echo "❌ Failed to deploy migrations"
  exit 1
fi

echo ""

# Step 4: Verify status
echo "Step 4: Verifying migration status..."
npx prisma migrate status

echo ""
echo "=================================================================="
echo ""
echo "🎉 Migration fix complete!"
echo ""

