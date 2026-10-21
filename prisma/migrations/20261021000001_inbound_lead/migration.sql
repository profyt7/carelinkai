-- OL-167a: inbound-call lead record (the published CareLinkAI number).
DO $$ BEGIN CREATE TYPE "InboundCallerType" AS ENUM ('PLANNER', 'FAMILY', 'FACILITY', 'OTHER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InboundLeadUrgency" AS ENUM ('TODAY', 'THIS_WEEK', 'PLANNING'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InboundLeadStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "InboundLead" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "callerType" "InboundCallerType" NOT NULL,
    "name" TEXT,
    "organization" TEXT,
    "callbackPhone" TEXT NOT NULL,
    "urgency" "InboundLeadUrgency",
    "reason" VARCHAR(280),
    "transcriptUrl" TEXT,
    "recordingUrl" TEXT,
    "afterHours" BOOLEAN NOT NULL DEFAULT false,
    "status" "InboundLeadStatus" NOT NULL DEFAULT 'NEW',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contactedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "phiFlag" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundLead_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InboundLead_conversationId_key" ON "InboundLead"("conversationId");
CREATE INDEX IF NOT EXISTS "InboundLead_status_receivedAt_idx" ON "InboundLead"("status", "receivedAt");
CREATE INDEX IF NOT EXISTS "InboundLead_callerType_receivedAt_idx" ON "InboundLead"("callerType", "receivedAt");
