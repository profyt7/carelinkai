-- Pay when ready (10/31): payment link + shortlist release on the Family Concierge order. Additive, nullable.
ALTER TABLE "ConciergeOrder" ADD COLUMN "paymentLinkUrl" TEXT;
ALTER TABLE "ConciergeOrder" ADD COLUMN "paymentLinkSentAt" TIMESTAMP(3);
ALTER TABLE "ConciergeOrder" ADD COLUMN "shortlistReleasedAt" TIMESTAMP(3);
