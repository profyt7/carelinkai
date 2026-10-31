-- Self-serve listing claims (fix/self-serve-claim). Additive.
CREATE TYPE "HomeClaimStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

CREATE TABLE "HomeClaim" (
    "id" TEXT NOT NULL,
    "homeId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "status" "HomeClaimStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    CONSTRAINT "HomeClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HomeClaim_homeId_status_idx" ON "HomeClaim"("homeId", "status");
CREATE INDEX "HomeClaim_operatorId_status_idx" ON "HomeClaim"("operatorId", "status");
CREATE INDEX "HomeClaim_status_createdAt_idx" ON "HomeClaim"("status", "createdAt");

-- One pending claim per home, enforced by the database.
CREATE UNIQUE INDEX "HomeClaim_one_pending_per_home" ON "HomeClaim"("homeId") WHERE "status" = 'PENDING_REVIEW';

ALTER TABLE "HomeClaim" ADD CONSTRAINT "HomeClaim_homeId_fkey" FOREIGN KEY ("homeId") REFERENCES "AssistedLivingHome"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HomeClaim" ADD CONSTRAINT "HomeClaim_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
