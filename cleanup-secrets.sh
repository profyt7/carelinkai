#!/bin/bash
set -e

echo "========================================"
echo "🔒 CLEANING UP SENSITIVE FILES"
echo "========================================"
echo ""

# Reset the commit
echo "Resetting last commit..."
git reset HEAD~1

# Remove sensitive files from staging
echo "Removing sensitive files..."
git reset HEAD .env
git reset HEAD .env.backup.20251219_195908
git reset HEAD .push_script.sh
git reset HEAD commit-phase1a.sh
git reset HEAD QUICK_START_GUIDE.md
git reset HEAD RENDER_ENVIRONMENT_SETUP.md
git reset HEAD AI_SERVICES_CONFIGURATION_SUMMARY.md
git reset HEAD CONFIGURATION_COMPLETE.md

# Add only necessary files
echo "Staging only necessary files for Phase 1A..."
git add package*.json
git add prisma/schema.prisma
git add prisma/migrations/20251220025013_phase1a_enums/
git add prisma/migrations/20251220025039_phase1a_columns_and_tables/
git add src/lib/documents/
git add src/app/api/documents/

echo ""
echo "✅ Sensitive files removed from staging"
echo ""
