#!/bin/bash

# Exit on error
set -e

# Print commands as they execute
set -x

echo "========================================="
echo "RENDER BUILD SCRIPT - CARELINKAI"
echo "========================================="
echo ""

echo "Environment Info:"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Date: $(date)"
echo ""

# Load Prisma environment variables if exists
if [ -f ".env.prisma" ]; then
  echo "Loading Prisma environment variables..."
  export $(cat .env.prisma | grep -v '^#' | xargs)
fi

echo "========================================="
echo "STEP 1: INSTALL DEPENDENCIES"
echo "========================================="
npm install --legacy-peer-deps
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ npm install failed with exit code: $EXIT_CODE"
  exit $EXIT_CODE
fi
echo "✅ npm install completed successfully"
echo ""

echo "========================================="
echo "STEP 2: GENERATE PRISMA CLIENT"
echo "========================================="
echo "Prisma version:"
npx prisma --version

echo ""
echo "Prisma environment:"
echo "PRISMA_CLI_BINARY_TARGETS=${PRISMA_CLI_BINARY_TARGETS:-not set}"
echo "DATABASE_URL=${DATABASE_URL:0:30}... (truncated for security)"

echo ""
echo "Validating Prisma schema..."
npx prisma validate

echo ""
echo "Generating Prisma client with binary targets..."
npx prisma generate --schema=./prisma/schema.prisma

EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ prisma generate failed with exit code: $EXIT_CODE"
  exit $EXIT_CODE
fi
echo "✅ prisma generate completed successfully"
echo ""

echo "Verifying Prisma client..."
if [ -d "node_modules/.prisma/client" ]; then
  echo "✅ Prisma client exists"
  ls -lh node_modules/.prisma/client/ | head -5
else
  echo "❌ Prisma client not found!"
  exit 1
fi
echo ""

echo "========================================="
echo "STEP 3: BUILD NEXT.JS APPLICATION"
echo "========================================="
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ npm run build failed with exit code: $EXIT_CODE"
  exit $EXIT_CODE
fi
echo "✅ npm run build completed successfully"
echo ""

echo "========================================="
echo "BUILD COMPLETED SUCCESSFULLY!"
echo "========================================="
