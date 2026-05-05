CREATE TABLE "BackgroundCheckInvitation" (
    "id" TEXT NOT NULL,
    "orderedByUserId" TEXT NOT NULL,
    "orderedByRole" TEXT NOT NULL,
    "subjectFirstName" TEXT NOT NULL,
    "subjectLastName" TEXT NOT NULL,
    "subjectEmail" TEXT NOT NULL,
    "subjectRole" TEXT,
    "packageType" TEXT NOT NULL,
    "pricePaid" DECIMAL(10,2),
    "stripePaymentId" TEXT,
    "checkrInvitationId" TEXT,
    "checkrCandidateId" TEXT,
    "checkrReportId" TEXT,
    "invitationUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "reportUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackgroundCheckInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BackgroundCheckInvitation_checkrInvitationId_key" ON "BackgroundCheckInvitation"("checkrInvitationId");
CREATE UNIQUE INDEX "BackgroundCheckInvitation_checkrReportId_key" ON "BackgroundCheckInvitation"("checkrReportId");
CREATE INDEX "BackgroundCheckInvitation_orderedByUserId_idx" ON "BackgroundCheckInvitation"("orderedByUserId");
CREATE INDEX "BackgroundCheckInvitation_status_idx" ON "BackgroundCheckInvitation"("status");
