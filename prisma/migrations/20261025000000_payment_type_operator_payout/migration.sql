-- OL-185: operator payouts are recorded as Payment rows so the payable balance
-- can subtract prior payouts. Enum value in its own migration (Postgres cannot
-- use a new enum value inside the transaction that added it).
ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'OPERATOR_PAYOUT';
