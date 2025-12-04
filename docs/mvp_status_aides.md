# CareLinkAI - Phase 1 MVP Status Matrix (Aide / Caregiver Marketplace)

| Area                     | Role      | Capability                                          | Status | Notes / Gaps |
|--------------------------|-----------|-----------------------------------------------------|--------|--------------|
| Aide signup              | Aide      | Create account and log in                           | DONE   | Registration supports CAREGIVER role; email verification flow. API: /api/auth/register; UI: /auth/register, /auth/login. |
| Aide profile basics      | Aide      | Create/edit profile (name, bio, photo)             | DONE   | Bio, yearsExperience, hourlyRate, address, photo upload. API: /api/profile, /api/profile/photo; UI: /settings/profile. |
| Aide skills & tags       | Aide      | Add skills, certifications, experience              | DONE   | specialties/settings/careTypes editable at /settings/profile; backend validates/persists via /api/profile. |
| Aide availability        | Aide      | Set/update availability (days/times)                | DONE   | Caregiver-facing UI at /settings/availability with add/edit/delete; APIs: /api/caregiver/availability (CRUD) and /api/calendar/availability; Prisma AvailabilitySlot in place. |
| Aide documents upload    | Aide      | Upload certifications (CPR, CNA, etc.)             | DONE   | Credentials CRUD + presigned upload. APIs: /api/caregiver/credentials, /api/caregiver/credentials/upload-url, /api/caregiver/credentials/[id]; UI: /settings/credentials. |
| Aide verification status | Admin     | Mark aide as verified / pending / rejected          | TODO   | No admin/RBAC endpoints or UI to verify caregivers/credentials. |
| Aide search list         | Operator  | Browse/search list of aides                         | DONE   | Marketplace caregiver list implemented. API: /api/marketplace/caregivers; UI: /marketplace. |
| Aide filters             | Operator  | Filter aides by location, skills, availability      | DONE   | Filters for q, city/state, radius, rate, experience, specialties, settings, careTypes, and availability (availableOnDay/Start/End) present in API and UI controls on /marketplace. |
| Aide detail view         | Operator  | View aide profile, skills, docs, availability       | WIP    | Profile shows core info; availability calendar and credential/doc listing not yet surfaced on detail page. UI: /marketplace/caregivers/[id]. |
| Operator -> Aide contact  | Operator  | Send an initial contact / message to aide           | WIP    | Messaging works (/api/messages, /messages); caregiver detail/card does not consistently deep-link to a specific caregiver conversation. |
| Aide -> Operator reply    | Aide      | Respond to operator (basic 2-way communication)     | DONE   | Two-way messaging works with threads/unread. APIs: /api/messages, /api/messages/threads; UI: /messages. |
| Aide visibility control  | Aide      | Set profile as active/paused in marketplace         | TODO   | No visibility toggle/field or UI to pause/hide profiles. |
| Admin aide oversight     | Admin     | List/search aides; view profiles & status           | TODO   | No admin-facing caregiver list/search/status views. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done
