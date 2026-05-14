-- AlterTable: Document
-- Add classification (default PHI for safety — most callers are resident/inquiry-linked)
-- Add storage to track upload destination (s3 or cloudinary)
ALTER TABLE "Document" ADD COLUMN "classification" "DataClassification" NOT NULL DEFAULT 'PHI';
ALTER TABLE "Document" ADD COLUMN "storage" TEXT;

-- Data fix: null out local-filesystem photoUrls on Resident
-- Rows with /uploads/ paths point to ephemeral container storage — not recoverable.
-- New uploads go to S3. These rows will show no photo until operator re-uploads.
UPDATE "Resident" SET "photoUrl" = NULL WHERE "photoUrl" LIKE '/uploads/%';
