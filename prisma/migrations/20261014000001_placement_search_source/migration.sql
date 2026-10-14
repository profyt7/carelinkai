-- Sprint W4 0a: tag where a concierge request came from (null/'dp_app' = DP in
-- the app, 'concierge_page' = private-pay family via /concierge). Additive +
-- idempotent.
ALTER TABLE "PlacementSearch" ADD COLUMN IF NOT EXISTS "source" TEXT;
CREATE INDEX IF NOT EXISTS "PlacementSearch_source_idx" ON "PlacementSearch" ("source");
