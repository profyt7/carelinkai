-- =============================================================================
-- CareLinkAI PHI Verification Audit
-- READ-ONLY. No writes. Run against production DATABASE_URL.
-- Purpose: Determine if production DB contains real PHI or only test/seed data.
-- Generated: 2026-05-13
--
-- HOW TO RUN:
--   psql "$DATABASE_URL" -f scripts/phi-audit.sql -o phi-audit-results.txt
--
-- MASKING: Output masks names to initials, DOB to year, email to X***@domain,
-- phone to ***-XXXX. Still treat output as sensitive — do not commit results.
--
-- STOP AND REPORT TO CHRIS if any section shows real-looking non-test data.
-- =============================================================================

\timing on
\pset null '(null)'

-- =============================================================================
-- SECTION 1: ROW COUNTS ACROSS ALL PHI-BEARING TABLES
-- Quick overview: if counts are all <30 this is almost certainly seed data only.
-- =============================================================================

\echo ''
\echo '=== SECTION 1: ROW COUNTS ==='

SELECT
  'User'                   AS table_name, COUNT(*) AS total_rows FROM "User"
UNION ALL SELECT 'Family',                COUNT(*) FROM "Family"
UNION ALL SELECT 'Resident',              COUNT(*) FROM "Resident"
UNION ALL SELECT 'ResidentDocument',      COUNT(*) FROM "ResidentDocument"
UNION ALL SELECT 'ResidentNote',          COUNT(*) FROM "ResidentNote"
UNION ALL SELECT 'ResidentIncident',      COUNT(*) FROM "ResidentIncident"
UNION ALL SELECT 'ResidentContact',       COUNT(*) FROM "ResidentContact"
UNION ALL SELECT 'ResidentComplianceItem',COUNT(*) FROM "ResidentComplianceItem"
UNION ALL SELECT 'FamilyContact',         COUNT(*) FROM "FamilyContact"
UNION ALL SELECT 'FamilyDocument',        COUNT(*) FROM "FamilyDocument"
UNION ALL SELECT 'FamilyNote',            COUNT(*) FROM "FamilyNote"
UNION ALL SELECT 'AssessmentResult',      COUNT(*) FROM "AssessmentResult"
UNION ALL SELECT 'EmergencyPreference',   COUNT(*) FROM "EmergencyPreference"
UNION ALL SELECT 'CareTimelineEvent',     COUNT(*) FROM "CareTimelineEvent"
UNION ALL SELECT 'Inquiry',               COUNT(*) FROM "Inquiry"
UNION ALL SELECT 'InquiryDocument',       COUNT(*) FROM "InquiryDocument"
UNION ALL SELECT 'PlacementSearch',       COUNT(*) FROM "PlacementSearch"
UNION ALL SELECT 'PlacementRequest',      COUNT(*) FROM "PlacementRequest"
UNION ALL SELECT 'GalleryPhoto',          COUNT(*) FROM "GalleryPhoto"
UNION ALL SELECT 'Ride',                  COUNT(*) FROM "Ride"
UNION ALL SELECT 'Booking',               COUNT(*) FROM "Booking"
UNION ALL SELECT 'AuditLog',              COUNT(*) FROM "AuditLog"
ORDER BY total_rows DESC;

-- =============================================================================
-- SECTION 2: USER TABLE — TEST vs REAL ACCOUNT BREAKDOWN
-- Flag: any user whose email doesn't match test/demo/seed/example patterns
-- =============================================================================

\echo ''
\echo '=== SECTION 2: USER ACCOUNT CLASSIFICATION ==='

SELECT
  role,
  COUNT(*) AS total,
  COUNT(*) FILTER (
    WHERE email ILIKE '%test%'
       OR email ILIKE '%demo%'
       OR email ILIKE '%seed%'
       OR email ILIKE '%example%'
       OR email ILIKE '%@carelinkai%'
       OR email ILIKE '%profyt7%'
       OR email ILIKE '%tolliver%'
       OR email ILIKE '%localhost%'
       OR email ILIKE '%fake%'
  ) AS looks_like_test,
  COUNT(*) FILTER (
    WHERE email NOT ILIKE '%test%'
      AND email NOT ILIKE '%demo%'
      AND email NOT ILIKE '%seed%'
      AND email NOT ILIKE '%example%'
      AND email NOT ILIKE '%@carelinkai%'
      AND email NOT ILIKE '%profyt7%'
      AND email NOT ILIKE '%tolliver%'
      AND email NOT ILIKE '%localhost%'
      AND email NOT ILIKE '%fake%'
  ) AS looks_like_real
FROM "User"
GROUP BY role
ORDER BY total DESC;

\echo ''
\echo '--- User emails that do NOT match test patterns (masked) ---'

SELECT
  role,
  LEFT(email, 1) || '***@' || SPLIT_PART(email, '@', 2) AS masked_email,
  "createdAt"::date AS created_date
FROM "User"
WHERE email NOT ILIKE '%test%'
  AND email NOT ILIKE '%demo%'
  AND email NOT ILIKE '%seed%'
  AND email NOT ILIKE '%example%'
  AND email NOT ILIKE '%@carelinkai%'
  AND email NOT ILIKE '%profyt7%'
  AND email NOT ILIKE '%tolliver%'
  AND email NOT ILIKE '%localhost%'
  AND email NOT ILIKE '%fake%'
ORDER BY "createdAt" DESC
LIMIT 20;

-- =============================================================================
-- SECTION 3: RESIDENT TABLE — THE MOST SENSITIVE PHI
-- Any resident with real DOB / real medical data = confirmed PHI
-- =============================================================================

\echo ''
\echo '=== SECTION 3: RESIDENT RECORDS ==='

SELECT
  COUNT(*) AS total_residents,
  COUNT(*) FILTER (WHERE "medicalConditions" IS NOT NULL) AS has_medical_conditions,
  COUNT(*) FILTER (WHERE "medications" IS NOT NULL)       AS has_medications,
  COUNT(*) FILTER (WHERE "allergies" IS NOT NULL)         AS has_allergies,
  COUNT(*) FILTER (WHERE "notes" IS NOT NULL)             AS has_notes,
  COUNT(*) FILTER (WHERE "photoUrl" IS NOT NULL)          AS has_photo_url,
  COUNT(*) FILTER (WHERE "dateOfBirth" < '1990-01-01')    AS born_before_1990,
  COUNT(*) FILTER (WHERE "dateOfBirth" >= '1990-01-01')   AS born_1990_or_later
FROM "Resident";

\echo ''
\echo '--- Resident sample (masked — first/last initials, DOB year only) ---'

SELECT
  LEFT("firstName", 1) || '.' || LEFT("lastName", 1) || '.'   AS name_initials,
  EXTRACT(YEAR FROM "dateOfBirth")::int                        AS dob_year,
  gender,
  status,
  "medicalConditions" IS NOT NULL                              AS has_medical,
  "medications" IS NOT NULL                                    AS has_meds,
  "createdAt"::date                                            AS created_date
FROM "Resident"
ORDER BY "createdAt" DESC
LIMIT 10;

-- =============================================================================
-- SECTION 4: CLINICAL CONTENT TABLES — CHECK FOR REAL MEDICAL DATA
-- =============================================================================

\echo ''
\echo '=== SECTION 4: CLINICAL CONTENT ==='

SELECT 'ResidentNote'      AS table_name, COUNT(*) AS rows,
  AVG(LENGTH(content))::int AS avg_content_length
FROM "ResidentNote"
UNION ALL
SELECT 'ResidentIncident', COUNT(*),
  AVG(LENGTH(COALESCE(description, '')))::int
FROM "ResidentIncident"
UNION ALL
SELECT 'AssessmentResult', COUNT(*),
  AVG(LENGTH(COALESCE(notes, '')))::int
FROM "AssessmentResult";

\echo ''
\echo '--- ResidentNote sample (content truncated to 60 chars) ---'

SELECT
  "residentId",
  visibility,
  LEFT(content, 60) AS content_preview,
  "createdAt"::date
FROM "ResidentNote"
ORDER BY "createdAt" DESC
LIMIT 5;

\echo ''
\echo '--- ResidentIncident sample ---'

SELECT
  "residentId",
  type,
  severity,
  status,
  LEFT(COALESCE(description, ''), 60) AS description_preview,
  "occurredAt"::date
FROM "ResidentIncident"
ORDER BY "occurredAt" DESC
LIMIT 5;

-- =============================================================================
-- SECTION 5: CONTACT TABLES — CHECK FOR REAL PII
-- =============================================================================

\echo ''
\echo '=== SECTION 5: CONTACT RECORDS ==='

SELECT 'ResidentContact' AS table_name, COUNT(*) AS rows,
  COUNT(*) FILTER (WHERE email IS NOT NULL) AS has_email,
  COUNT(*) FILTER (WHERE phone IS NOT NULL) AS has_phone
FROM "ResidentContact"
UNION ALL
SELECT 'FamilyContact', COUNT(*),
  COUNT(*) FILTER (WHERE email IS NOT NULL),
  COUNT(*) FILTER (WHERE phone IS NOT NULL)
FROM "FamilyContact";

\echo ''
\echo '--- ResidentContact sample (masked) ---'

SELECT
  LEFT(name, 1) || '***'                                       AS masked_name,
  relationship,
  CASE WHEN email IS NOT NULL
       THEN LEFT(email, 1) || '***@' || SPLIT_PART(email, '@', 2)
       ELSE '(null)' END                                       AS masked_email,
  CASE WHEN phone IS NOT NULL
       THEN '***-' || RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 4)
       ELSE '(null)' END                                       AS masked_phone,
  "isPrimary",
  "createdAt"::date
FROM "ResidentContact"
ORDER BY "createdAt" DESC
LIMIT 5;

-- =============================================================================
-- SECTION 6: DOCUMENT STORAGE — IDENTIFY STORAGE PROVIDER
-- Cloudinary URLs = cloudinary.com. S3 = amazonaws.com. Local = /uploads/.
-- PHI documents on Cloudinary = compliance gap.
-- =============================================================================

\echo ''
\echo '=== SECTION 6: DOCUMENT STORAGE PROVIDER DISTRIBUTION ==='

SELECT
  'ResidentDocument' AS table_name,
  CASE
    WHEN "fileUrl" ILIKE '%cloudinary%'   THEN 'Cloudinary'
    WHEN "fileUrl" ILIKE '%amazonaws%'    THEN 'S3/AWS'
    WHEN "fileUrl" ILIKE '%render.com%'   THEN 'Render'
    WHEN "fileUrl" ILIKE '%localhost%'    THEN 'Localhost'
    ELSE 'Other/Unknown'
  END AS storage_provider,
  COUNT(*) AS file_count
FROM "ResidentDocument"
GROUP BY 2

UNION ALL

SELECT
  'FamilyDocument',
  CASE
    WHEN "fileUrl" ILIKE '%cloudinary%'   THEN 'Cloudinary'
    WHEN "fileUrl" ILIKE '%amazonaws%'    THEN 'S3/AWS'
    WHEN "fileUrl" ILIKE '%render.com%'   THEN 'Render'
    WHEN "fileUrl" ILIKE '%localhost%'    THEN 'Localhost'
    ELSE 'Other/Unknown'
  END,
  COUNT(*)
FROM "FamilyDocument"
GROUP BY 2

UNION ALL

SELECT
  'InquiryDocument',
  CASE
    WHEN "fileUrl" ILIKE '%cloudinary%'   THEN 'Cloudinary'
    WHEN "fileUrl" ILIKE '%amazonaws%'    THEN 'S3/AWS'
    WHEN "fileUrl" ILIKE '%render.com%'   THEN 'Render'
    WHEN "fileUrl" ILIKE '%localhost%'    THEN 'Localhost'
    ELSE 'Other/Unknown'
  END,
  COUNT(*)
FROM "InquiryDocument"
GROUP BY 2

UNION ALL

SELECT
  'GalleryPhoto (resident photos)',
  CASE
    WHEN "fileUrl" ILIKE '%cloudinary%'   THEN 'Cloudinary'
    WHEN "fileUrl" ILIKE '%amazonaws%'    THEN 'S3/AWS'
    WHEN "fileUrl" ILIKE '%render.com%'   THEN 'Render'
    WHEN "fileUrl" ILIKE '%localhost%'    THEN 'Localhost'
    ELSE 'Other/Unknown'
  END,
  COUNT(*)
FROM "GalleryPhoto"
GROUP BY 2

ORDER BY 1, 3 DESC;

-- =============================================================================
-- SECTION 7: INQUIRY TABLE — EXTERNAL CONTACT INFO (PUBLIC-FACING PHI)
-- Inquiries capture contactName, contactEmail, contactPhone from website visitors.
-- Even demo mode can accumulate real contacts if the form is publicly accessible.
-- =============================================================================

\echo ''
\echo '=== SECTION 7: INQUIRY CONTACT DATA ==='

SELECT
  COUNT(*) AS total_inquiries,
  COUNT(*) FILTER (WHERE "contactName" IS NOT NULL)  AS has_contact_name,
  COUNT(*) FILTER (WHERE "contactEmail" IS NOT NULL) AS has_contact_email,
  COUNT(*) FILTER (WHERE "contactPhone" IS NOT NULL) AS has_contact_phone,
  MIN("createdAt")::date AS oldest,
  MAX("createdAt")::date AS newest
FROM "Inquiry";

\echo ''
\echo '--- Non-test inquiry emails (masked) ---'

SELECT
  status,
  LEFT("contactEmail", 1) || '***@' || SPLIT_PART("contactEmail", '@', 2) AS masked_email,
  "careRecipientAge",
  "createdAt"::date
FROM "Inquiry"
WHERE "contactEmail" IS NOT NULL
  AND "contactEmail" NOT ILIKE '%test%'
  AND "contactEmail" NOT ILIKE '%demo%'
  AND "contactEmail" NOT ILIKE '%example%'
  AND "contactEmail" NOT ILIKE '%fake%'
ORDER BY "createdAt" DESC
LIMIT 10;

-- =============================================================================
-- SECTION 8: PLACEMENT DATA — CONTAINS patientInfo JSON BLOB
-- patientInfo = name, diagnosis, care needs, timeline — high-sensitivity PHI
-- =============================================================================

\echo ''
\echo '=== SECTION 8: PLACEMENT DATA ==='

SELECT
  COUNT(*) AS total_searches,
  COUNT(*) FILTER (WHERE "queryText" IS NOT NULL AND LENGTH("queryText") > 20) AS has_real_query,
  MIN("createdAt")::date AS oldest,
  MAX("createdAt")::date AS newest
FROM "PlacementSearch";

SELECT
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE "patientInfo" IS NOT NULL) AS has_patient_info,
  MIN("createdAt")::date AS oldest,
  MAX("createdAt")::date AS newest
FROM "PlacementRequest";

\echo ''
\echo '--- PlacementSearch query previews (60 chars) ---'

SELECT
  LEFT("queryText", 60) AS query_preview,
  status,
  "createdAt"::date
FROM "PlacementSearch"
ORDER BY "createdAt" DESC
LIMIT 5;

-- =============================================================================
-- SECTION 9: FAMILY TABLE — MEDICAL/PERSONAL INTAKE FIELDS
-- primaryDiagnosis, emergencyContact/Phone captured during family onboarding
-- =============================================================================

\echo ''
\echo '=== SECTION 9: FAMILY INTAKE DATA ==='

SELECT
  COUNT(*) AS total_families,
  COUNT(*) FILTER (WHERE "primaryDiagnosis" IS NOT NULL)    AS has_diagnosis,
  COUNT(*) FILTER (WHERE "emergencyContact" IS NOT NULL)    AS has_emergency_contact,
  COUNT(*) FILTER (WHERE "emergencyPhone" IS NOT NULL)      AS has_emergency_phone,
  COUNT(*) FILTER (WHERE "primaryContactName" IS NOT NULL)  AS has_primary_contact_name,
  COUNT(*) FILTER (WHERE "careNotes" IS NOT NULL)           AS has_care_notes
FROM "Family";

-- =============================================================================
-- SECTION 10: AUDIT LOG — RECENT ACTIONS (PHI DATA ACCESS TRAIL)
-- Large audit log + non-test actors = evidence of real usage
-- =============================================================================

\echo ''
\echo '=== SECTION 10: AUDIT LOG ACTIVITY ==='

SELECT
  COUNT(*) AS total_audit_entries,
  MIN("timestamp")::date AS oldest_entry,
  MAX("timestamp")::date AS newest_entry,
  COUNT(DISTINCT "userId") AS distinct_users
FROM "AuditLog";

\echo ''
\echo '--- Audit log action distribution ---'

SELECT action, COUNT(*) AS count
FROM "AuditLog"
GROUP BY action
ORDER BY count DESC
LIMIT 15;

-- =============================================================================
-- SECTION 11: FINAL VERDICT HELPER
-- Returns a simple verdict: SEED_ONLY, MIXED, or LIKELY_REAL_PHI
-- =============================================================================

\echo ''
\echo '=== SECTION 11: AUTOMATED VERDICT ==='

WITH counts AS (
  SELECT
    (SELECT COUNT(*) FROM "Resident") AS resident_count,
    (SELECT COUNT(*) FROM "User"
     WHERE email NOT ILIKE '%test%'
       AND email NOT ILIKE '%demo%'
       AND email NOT ILIKE '%seed%'
       AND email NOT ILIKE '%example%'
       AND email NOT ILIKE '%@carelinkai%'
       AND email NOT ILIKE '%profyt7%'
       AND email NOT ILIKE '%tolliver%'
       AND email NOT ILIKE '%fake%') AS real_looking_users,
    (SELECT COUNT(*) FROM "Inquiry"
     WHERE "contactEmail" IS NOT NULL
       AND "contactEmail" NOT ILIKE '%test%'
       AND "contactEmail" NOT ILIKE '%demo%'
       AND "contactEmail" NOT ILIKE '%example%'
       AND "contactEmail" NOT ILIKE '%fake%') AS real_looking_inquiries,
    (SELECT COUNT(*) FROM "ResidentDocument") AS resident_docs,
    (SELECT COUNT(*) FROM "ResidentNote") AS resident_notes
)
SELECT
  resident_count,
  real_looking_users,
  real_looking_inquiries,
  resident_docs,
  resident_notes,
  CASE
    WHEN resident_count = 0
         AND real_looking_users <= 5
         AND real_looking_inquiries = 0
    THEN 'SEED_ONLY — safe to proceed with Phase 1 HIPAA work'
    WHEN resident_count > 0
         AND real_looking_users > 5
         AND real_looking_inquiries > 0
    THEN 'LIKELY_REAL_PHI — STOP AND REPORT TO CHRIS'
    ELSE 'MIXED — manual review required; see sections above'
  END AS verdict
FROM counts;

\echo ''
\echo '=== AUDIT COMPLETE ==='
\echo 'If verdict is LIKELY_REAL_PHI: do not proceed. Contact Chris immediately.'
\echo 'If verdict is SEED_ONLY: document in vault and proceed with Phase 1 work.'
\echo 'If verdict is MIXED: manually review each suspicious section above.'
