-- OL-163 (a): AI_CALL source for availability + history. Its own migration
-- because Postgres refuses to USE a new enum value (the DEFAULT in the next
-- migration) inside the transaction that added it.

DO $$ BEGIN ALTER TYPE "AvailabilitySource" ADD VALUE 'AI_CALL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "EventSource" ADD VALUE 'AI_CALL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
