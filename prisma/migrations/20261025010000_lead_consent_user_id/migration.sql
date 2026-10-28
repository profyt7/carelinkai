-- OL-184: SMS opt-in consent from account forms is stored on LeadConsent and
-- references the user. Additive, nullable, no FK (evidence outlives the user).
ALTER TABLE "LeadConsent" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE INDEX IF NOT EXISTS "LeadConsent_userId_idx" ON "LeadConsent"("userId");
