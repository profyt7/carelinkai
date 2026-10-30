-- Provider taxonomy (10/29): optional delivery mode(s). Additive only: a new column whose
-- default is an empty list; no existing value is read or changed.
ALTER TABLE "Provider" ADD COLUMN "deliveryModes" TEXT[] DEFAULT ARRAY[]::TEXT[];
