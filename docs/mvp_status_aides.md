# CareLinkAI – Phase 1 MVP Status Matrix (Aide / Caregiver Marketplace)

| Area                     | Role      | Capability                                          | Status | Notes / Gaps |
|--------------------------|-----------|-----------------------------------------------------|--------|--------------|
| Aide signup              | Aide      | Create account and log in                           | DONE   | Registration supports CAREGIVER role; email verification flow. API: src/app/api/auth/register/route.ts; UI: /auth/register, /auth/login. |
| Aide profile basics      | Aide      | Create/edit profile (name, bio, photo)             | DONE   | Profile edit incl. bio, yearsExperience, hourlyRate, address, photo upload. API: /api/profile, /api/profile/photo; UI: /settings/profile. |
| Aide skills & tags       | Aide      | Add skills, certifications, experience              | DONE   | UI: /settings/profile → “Skills & Tags” section lets caregivers toggle specialties, settings, careTypes (loaded from /api/marketplace/categories). API: /api/profile (PATCH) validates and persists arrays against MarketplaceCategory slugs (CategoryType.SPECIALTY/SETTING/CARE_TYPE). DB: Caregiver.specialties/settings/careTypes fields in prisma/schema.prisma. |
| Aide availability        | Aide      | Set/update availability (days/times)                | DONE   | AvailabilitySlot model and availability JSON on caregiver; availability check API exists (/api/calendar/availability). Caregiver-facing UI implemented at /settings/availability with weekly calendar view, CRUD operations via /api/caregiver/availability, supports recurrence (daily/weekly). |
| Aide documents upload    | Aide      | Upload certifications (CPR, CNA, etc.)             | DONE   | Full credentials CRUD with presigned upload. APIs: /api/caregiver/credentials, /api/caregiver/credentials/upload-url, /api/caregiver/credentials/[id]; UI: /settings/credentials. |
| Aide verification status | Admin     | Mark aide as verified / pending / rejected          | TODO   | Credential.isVerified fields exist, but no admin/RBAC endpoint to verify credentials or mark caregiver verified. |
| Aide search list         | Operator  | Browse/search list of aides                         | DONE   | Marketplace caregiver list implemented. API: /api/marketplace/caregivers; UI: /marketplace (Caregivers tab/cards). |
| Aide filters             | Operator  | Filter aides by location, skills, availability      | DONE   | Filters: q, city/state, radius, rate, experience, specialties, settings, careTypes implemented. Availability-based filtering implemented via availableDate, availableStartTime, availableEndTime query params in /api/marketplace/caregivers; UI controls added to marketplace filters panel. |
| Aide detail view         | Operator  | View aide profile, skills, docs, availability       | DONE   | Detail shows photo, bio, rate, experience, specialties, reviews, hire request. Availability calendar (next 7 days) and verified credentials/docs now surfaced on profile. UI: /marketplace/caregivers/[id]. |
| Operator → Aide contact  | Operator  | Send an initial contact / message to aide           | DONE   | Messaging system exists (/api/messages, /messages). Marketplace "Message" buttons now deep-link to caregiver conversation via ?userId= query param; mobile view handling added; messaging accessible from both card and detail views. |
| Aide → Operator reply    | Aide      | Respond to operator (basic 2-way communication)     | DONE   | Two-way messaging works with SSE notifications. APIs: /api/messages, /api/messages/threads; UI: /messages. |
| Aide visibility control  | Aide      | Set profile as active/paused in marketplace         | TODO   | No visibility toggle/field on Caregiver or UI to pause/hide from marketplace. |
| Admin aide oversight     | Admin     | List/search aides; view profiles & status           | TODO   | No admin-facing list/search for caregivers; operator endpoints cover only employed caregivers. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done