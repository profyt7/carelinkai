# CareLinkAI – Phase 1 MVP Status Matrix (Aide / Caregiver Marketplace)

| Area                     | Role      | Capability                                          | Status | Notes / Gaps |
|--------------------------|-----------|-----------------------------------------------------|--------|--------------|
| Aide signup              | Aide      | Create account and log in                           | DONE   | Registration supports CAREGIVER role; email verification flow. API: src/app/api/auth/register/route.ts; UI: /auth/register, /auth/login. |
| Aide profile basics      | Aide      | Create/edit profile (name, bio, photo)             | DONE   | Profile edit incl. bio, yearsExperience, hourlyRate, address, photo upload. API: /api/profile, /api/profile/photo; UI: /settings/profile. |
| Aide skills & tags       | Aide      | Add skills, certifications, experience              | WIP    | Credentials upload DONE (see below). Skills/specialties exist in model (Caregiver.specialties) and marketplace filtering, but no caregiver UI/API to edit specialties/settings/careTypes via /api/profile. |
| Aide availability        | Aide      | Set/update availability (days/times)                | DONE   | UI: src/app/settings/availability/page.tsx; API: src/app/api/caregiver/availability/route.ts (GET/POST/PUT/DELETE); DB: prisma/schema.prisma (model AvailabilitySlot); Integration: UI fetches/creates/updates/deletes via API and renders weekly calendar. |
| Aide documents upload    | Aide      | Upload certifications (CPR, CNA, etc.)             | DONE   | Full credentials CRUD with presigned upload. APIs: /api/caregiver/credentials, /api/caregiver/credentials/upload-url, /api/caregiver/credentials/[id]; UI: /settings/credentials. |
| Aide verification status | Admin     | Mark aide as verified / pending / rejected          | TODO   | Credential.isVerified fields exist, but no admin/RBAC endpoint to verify credentials or mark caregiver verified. |
| Aide search list         | Operator  | Browse/search list of aides                         | DONE   | Marketplace caregiver list implemented. API: /api/marketplace/caregivers; UI: /marketplace (Caregivers tab/cards). |
| Aide filters             | Operator  | Filter aides by location, skills, availability      | DONE   | UI: src/app/marketplace/page.tsx (availableDate, availableStartTime, availableEndTime controls + query param sync); API: src/app/api/marketplace/caregivers/route.ts processes availability params and filters via prisma.availabilitySlot overlap (startTime <= end, endTime >= start). |
| Aide detail view         | Operator  | View aide profile, skills, docs, availability       | DONE   | UI: src/app/marketplace/caregivers/[id]/page.tsx; Fetches prisma.availabilitySlot.findMany (next 7 days) and displays; Shows verified, non-expired credentials (where: isVerified: true, expirationDate >= now). |
| Operator → Aide contact  | Operator  | Send an initial contact / message to aide           | DONE   | Message button in src/app/marketplace/caregivers/[id]/page.tsx links to /messages?userId={caregiver.userId}; Messages page src/app/messages/page.tsx reads userId via useSearchParams and auto-selects conversation. |
| Aide → Operator reply    | Aide      | Respond to operator (basic 2-way communication)     | DONE   | Two-way messaging works with SSE notifications. APIs: /api/messages, /api/messages/threads; UI: /messages. |
| Aide visibility control  | Aide      | Set profile as active/paused in marketplace         | TODO   | No visibility toggle/field on Caregiver or UI to pause/hide from marketplace. |
| Admin aide oversight     | Admin     | List/search aides; view profiles & status           | TODO   | No admin-facing list/search for caregivers; operator endpoints cover only employed caregivers. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done