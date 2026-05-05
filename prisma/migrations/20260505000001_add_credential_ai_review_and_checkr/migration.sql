-- AddColumn: aiReviewStatus, aiReviewNotes, checkrReportId to ProviderCredential
ALTER TABLE "ProviderCredential" ADD COLUMN "aiReviewStatus" TEXT;
ALTER TABLE "ProviderCredential" ADD COLUMN "aiReviewNotes" TEXT;
ALTER TABLE "ProviderCredential" ADD COLUMN "checkrReportId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredential_checkrReportId_key" ON "ProviderCredential"("checkrReportId");
CREATE INDEX "ProviderCredential_checkrReportId_idx" ON "ProviderCredential"("checkrReportId");
