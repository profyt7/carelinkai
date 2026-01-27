#!/bin/bash

# Exit on error
set -e

# Print commands as they execute
set -x

echo "========================================="
echo "RENDER BUILD SCRIPT - VERBOSE MODE"
echo "========================================="
echo ""

echo "Environment Info:"
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Working directory: $(pwd)"
echo "Date: $(date)"
echo ""

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
npx prisma generate
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ prisma generate failed with exit code: $EXIT_CODE"
  exit $EXIT_CODE
fi
echo "✅ prisma generate completed successfully"
echo ""

echo "========================================="
echo "STEP 3: BUILD NEXT.JS APPLICATION"
echo "========================================="
# Increase Node.js memory limit to prevent OOM errors during build
# Professional Render plan has 4GB+ RAM - use 8GB heap for build
export NODE_OPTIONS="--max-old-space-size=8192"
echo "NODE_OPTIONS set to: $NODE_OPTIONS"
echo "Memory available for Node.js heap: 8192MB"
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ npm run build failed with exit code: $EXIT_CODE"
  exit $EXIT_CODE
fi
echo "✅ npm run build completed successfully"
echo ""

echo "========================================="
echo "STEP 4: COPY STATIC ASSETS FOR STANDALONE"
echo "========================================="
# Standalone mode requires copying static files manually
echo "Copying public folder to standalone..."
cp -r public .next/standalone/public 2>/dev/null || echo "No public folder to copy"
echo "Copying static files to standalone..."
cp -r .next/static .next/standalone/.next/static
echo "✅ Static assets copied successfully"
echo ""

echo "========================================="
echo "BUILD COMPLETED SUCCESSFULLY!"
echo "========================================="
