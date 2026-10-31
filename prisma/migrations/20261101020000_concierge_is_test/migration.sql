-- fix/concierge-outbound-safety: test concierge requests/orders never contact facilities. Additive.
ALTER TABLE "PlacementSearch" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ConciergeOrder" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: the live acceptance test (TEST ORDER A/B) and anything else that matches the test rule
-- (the family email's "+tag" contains "test", e.g. profyt7+cl-test-a@gmail.com, or the contact name starts with "TEST").
UPDATE "ConciergeOrder" SET "isTest" = true
WHERE "id" = 'cmvwto0q40002ol4tobyps2x4'
   OR "placementSearchId" = 'cmvwto0q40002ol4tobyps2x4'
   OR "email" ~* '\+[^@]*test[^@]*@';

UPDATE "PlacementSearch" SET "isTest" = true
WHERE "id" = 'cmvwto0q40002ol4tobyps2x4'
   OR "isConcierge" = true AND (
        COALESCE("patientInfo"->>'contactEmail', '') ~* '\+[^@]*test[^@]*@'
     OR COALESCE("patientInfo"->>'contactName', '') ILIKE 'TEST%'
   )
   OR "id" IN (SELECT "placementSearchId" FROM "ConciergeOrder" WHERE "isTest" = true AND "placementSearchId" IS NOT NULL);

UPDATE "ConciergeOrder" SET "isTest" = true
WHERE "placementSearchId" IN (SELECT "id" FROM "PlacementSearch" WHERE "isTest" = true);
