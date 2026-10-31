-- Concierge phase 2 (OL-248): one payment reminder + 14-day expiry. Additive.
ALTER TYPE "ConciergeOrderStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TABLE "ConciergeOrder" ADD COLUMN "paymentReminderSentAt" TIMESTAMP(3);
ALTER TABLE "ConciergeOrder" ADD COLUMN "expiredAt" TIMESTAMP(3);
