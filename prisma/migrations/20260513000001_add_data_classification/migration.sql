-- CreateEnum: DataClassification
-- Drives upload routing: PHI -> S3 (BAA-covered), PUBLIC/PII -> Cloudinary
-- See HIPAA_PHASE_1_DESIGN.md §6

CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'PII', 'PHI');

-- AlterTable: ResidentDocument
-- All resident documents default to PHI (medical records, care plans, etc.)
ALTER TABLE "ResidentDocument" ADD COLUMN "classification" "DataClassification" NOT NULL DEFAULT 'PHI';
ALTER TABLE "ResidentDocument" ADD COLUMN "storage" TEXT;

-- AlterTable: InquiryDocument
-- Default PHI: inquiry docs can include medical records, insurance with diagnosis codes
ALTER TABLE "InquiryDocument" ADD COLUMN "classification" "DataClassification" NOT NULL DEFAULT 'PHI';
ALTER TABLE "InquiryDocument" ADD COLUMN "storage" TEXT;

-- AlterTable: FamilyDocument
-- Default PHI: family documents are medical/legal records tied to resident care
ALTER TABLE "FamilyDocument" ADD COLUMN "classification" "DataClassification" NOT NULL DEFAULT 'PHI';
ALTER TABLE "FamilyDocument" ADD COLUMN "storage" TEXT;

-- AlterTable: GalleryPhoto
-- Default PHI: SharedGallery is linked to Family -> Resident; photos are in care context.
-- See HIPAA posture memo §2: resident photos linked to care records = PHI.
ALTER TABLE "GalleryPhoto" ADD COLUMN "classification" "DataClassification" NOT NULL DEFAULT 'PHI';
ALTER TABLE "GalleryPhoto" ADD COLUMN "storage" TEXT;
