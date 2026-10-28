-- OL-083 anonymous inquiry capture: allow Inquiry rows with no linked family
-- account. Public/anonymous leads are captured via on-row contact fields
-- (contactName/contactEmail/contactPhone); an operator can link a real family
-- later. The existing familyId FK (ON DELETE CASCADE) is preserved and remains
-- valid for a nullable column. Additive / non-destructive.
ALTER TABLE "Inquiry" ALTER COLUMN "familyId" DROP NOT NULL;
