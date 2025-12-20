#!/bin/bash
set -e

echo "=== Installing dependencies ==="
npm install --legacy-peer-deps || exit 1

echo "=== Generating Prisma client ==="
npx prisma generate || exit 2

echo "=== Building Next.js ==="
npm run build || exit 3

echo "=== Build complete ==="
