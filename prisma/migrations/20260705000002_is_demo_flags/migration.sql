-- OL-112: demo/tutorial fixture markers. Demo rows are RETAINED (tutorials
-- depend on them) but FILTERED from admin metrics and the public directory.
-- Backfilled by scripts/backfill-demo-flags.ts. Additive + fully idempotent.

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "AssistedLivingHome"
  ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "User_isDemo_idx" ON "User" ("isDemo");
CREATE INDEX IF NOT EXISTS "AssistedLivingHome_isDemo_idx" ON "AssistedLivingHome" ("isDemo");
