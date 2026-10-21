-- OL-167a: enum values first, in their own migration (Postgres cannot use a new
-- enum value inside the transaction that added it).
ALTER TYPE "AvailabilitySource" ADD VALUE IF NOT EXISTS 'AI_CALL_INBOUND';
ALTER TYPE "EntityType" ADD VALUE IF NOT EXISTS 'INBOUND_LEAD';
