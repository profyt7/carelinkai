-- Test inquiries (contact email matches TEST_EMAIL_PATTERN) are admin-only. Additive; existing rows are real (false).
ALTER TABLE "Inquiry" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
