# CareLinkAI – Phase 1 MVP Status Matrix (Aide / Caregiver Marketplace)

| Area                     | Role      | Capability                                          | Status | Notes / Gaps |
|--------------------------|-----------|-----------------------------------------------------|--------|--------------|
| Aide signup              | Aide      | Create account and log in                           | DONE   | Registration supports CAREGIVER role; email verification flow. API: src/app/api/auth/register/route.ts; UI: /auth/register, /auth/login. |
| Aide profile basics      | Aide      | Create/edit profile (name, bio, photo)             | DONE   | Profile edit incl. bio, yearsExperience, hourlyRate, address, photo upload. API: /api/profile, /api/profile/photo; UI: /settings/profile. |
| Aide skills & tags       | Aide      | Add skills, certifications, experience              | DONE   | Caregivers can edit specialties/settings/careTypes at /settings/profile; backend validates and persists via /api/profile. Marketplace filters and caregiver detail reflect updates. |
| Aide availability        | Aide      | Set/update availability (days/times)                | WIP    | AvailabilitySlot model + /api/calendar/availability exist; no caregiver-facing UI to set working hours/slots. |
| Aide documents upload    | Aide      | Upload certifications (CPR, CNA, etc.)             | DONE   | Credentials CRUD with presigned upload. APIs: /api/caregiver/credentials, /api/caregiver/credentials/upload-url, /api/caregiver/credentials/[id]; UI: /settings/credentials. |
| Aide verification status | Admin     | Mark aide as verified / pending / rejected          | TODO   | credential.isVerified exists; no admin endpoints/UI to verify caregivers/credentials. |
| Aide search list         | Operator  | Browse/search list of aides                         | DONE   | Marketplace caregiver list implemented. API: /api/marketplace/caregivers; UI: /marketplace (Caregivers tab/cards). |
| Aide filters             | Operator  | Filter aides by location, skills, availability      | WIP    | Filters include q, city/state, radius, rate, experience, specialties, settings, careTypes. No availability-based filter on main. |
| Aide detail view         | Operator  | View aide profile, skills, docs, availability       | WIP    | Shows bio, rate, experience, specialties, ratings. No availability or credentials surfaced. UI: /marketplace/caregivers/[id]. |
| Operator → Aide contact  | Operator  | Send an initial contact / message to aide           | WIP    | Messaging exists (/api/messages, /messages). Detail page links to /messages but doesn’t deep-link to caregiver. |
| Aide → Operator reply    | Aide      | Respond to operator (basic 2-way communication)     | DONE   | Two-way messaging with threads and unread; APIs: /api/messages, /api/messages/threads; UI: /messages. |
| Aide visibility control  | Aide      | Set profile as active/paused in marketplace         | TODO   | No visibility toggle/field on Caregiver and no UI to pause/hide from marketplace. |
| Admin aide oversight     | Admin     | List/search aides; view profiles & status           | TODO   | No admin-facing caregiver list/search or status views. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done
