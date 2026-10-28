#!/usr/bin/env bash
# HISTORICAL — see README.md in this folder. Already applied in production.
#
# Marks five migrations that failed or were drafted in Dec 2025 / Jan 2026 as
# rolled back, so `prisma migrate deploy` stops treating them as failed. Until
# OL-188 these ran on every boot inside `npm run migrate:deploy`.
#
#   DATABASE_URL=... bash scripts/one-time/resolve-rolled-back-migrations.sh
set -u

for m in \
  draft_add_document_processing \
  20251220024025_phase1a_document_processing \
  20251218162945_update_homes_to_active \
  20251221011617_add_document_classification_validation \
  20260107004129_add_impersonation_feature
do
  echo "→ prisma migrate resolve --rolled-back $m"
  npx prisma migrate resolve --rolled-back "$m" || echo "  (skipped: $m was not in a failed state)"
done
