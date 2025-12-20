#!/bin/bash
set -e

echo "========================================"
echo "🗄️  RUNNING DATABASE MIGRATION"
echo "========================================"
echo ""

echo "Generating Prisma client..."
npx prisma generate 2>&1 | tail -15

echo ""
echo "Running migration..."
npx prisma migrate dev --name phase1a_document_processing 2>&1 | tail -30

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Database migration completed successfully"
else
  echo ""
  echo "❌ Migration failed"
  exit 1
fi

echo ""
echo "✅ Prisma client generated and migration complete!"
