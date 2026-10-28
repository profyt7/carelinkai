-- OL-179: enum value in its own migration (Postgres cannot use a new enum
-- value inside the transaction that added it).
ALTER TYPE "InboundLeadSource" ADD VALUE IF NOT EXISTS 'WEB_TOUR_REQUEST';
