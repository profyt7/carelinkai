-- OL-166c: a QA-approved availability call may write the home's starting price.
-- Enum additions must run in their own migration (new values cannot be used in the same transaction).
ALTER TYPE "PriceSource" ADD VALUE IF NOT EXISTS 'AI_CALL';
