-- Security package §3: server-side session revocation. Additive; every user starts at 0,
-- which is also what tokens issued before this change are treated as.
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
