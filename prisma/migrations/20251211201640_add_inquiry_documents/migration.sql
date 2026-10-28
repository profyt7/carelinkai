-- CreateTable
CREATE TABLE IF NOT EXISTS "InquiryDocument" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "description" TEXT,
    "fileSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InquiryDocument_inquiryId_idx" ON "InquiryDocument"("inquiryId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InquiryDocument_uploadedById_idx" ON "InquiryDocument"("uploadedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InquiryDocument_documentType_idx" ON "InquiryDocument"("documentType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InquiryDocument_uploadedAt_idx" ON "InquiryDocument"("uploadedAt");

-- AddForeignKey (only if not exists - use DO block for safety)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'InquiryDocument_inquiryId_fkey'
    ) THEN
        ALTER TABLE "InquiryDocument" ADD CONSTRAINT "InquiryDocument_inquiryId_fkey" 
        FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'InquiryDocument_uploadedById_fkey'
    ) THEN
        ALTER TABLE "InquiryDocument" ADD CONSTRAINT "InquiryDocument_uploadedById_fkey" 
        FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
