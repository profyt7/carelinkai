# CareLinkAI â€“ Phase 1 MVP Status Matrix (Aide / Caregiver Marketplace)

| Area                     | Role      | Capability                                          | Status | Notes / Gaps |
|--------------------------|-----------|-----------------------------------------------------|--------|--------------|
| Aide signup              | Aide      | Create account and log in                           | DONE   | Registration supports CAREGIVER role; email verification flow. API: src/app/api/auth/register/route.ts; UI: /auth/register, /auth/login. |
| Aide profile basics      | Aide      | Create/edit profile (name, bio, photo)             | DONE   | Profile edit incl. bio, yearsExperience, hourlyRate, address, photo upload. API: /api/profile, /api/profile/photo; UI: /settings/profile. |
| Aide skills & tags       | Aide      | Add skills, certifications, experience              | DONE   | Caregivers can edit specialties/settings/careTypes at /settings/profile; backend validates and persists via /api/profile. Marketplace filters (specialties, settings, careTypes) and caregiver detail reflect updates. |
\|\ Aide\ availability\ \ \ \ \ \ \ \ \|\ Aide\ \ \ \ \ \ \|\ Set/update\ availability\ \(days/times\)\ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \|\ DONE\ \ \ \|\ Full\ caregiver-facing\ availability\ management\ with\ CRUD\ and\ overlap\ validation\.\ APIs:\ /api/caregiver/availability,\ /api/caregiver/availability/\[id];\ UI:\ /settings/availability\.\ \|
| Aide documents upload    | Aide      | Upload certifications (CPR, CNA, etc.)             | DONE   | Full credentials CRUD with presigned upload. APIs: /api/caregiver/credentials, /api/caregiver/credentials/upload-url, /api/caregiver/credentials/[id]; UI: /settings/credentials. |
| Aide verification status | Admin     | Mark aide as verified / pending / rejected          | TODO   | Credential.isVerified fields exist, but no admin/RBAC endpoint to verify credentials or mark caregiver verified. |
| Aide search list         | Operator  | Browse/search list of aides                         | DONE   | Marketplace caregiver list implemented. API: /api/marketplace/caregivers; UI: /marketplace (Caregivers tab/cards). |
| Aide filters             | Operator  | Filter aides by location, skills, availability      | WIP    | Filters: q, city/state, radius, rate, experience, specialties, settings, careTypes implemented. No availability-based filter. |
| Aide detail view         | Operator  | View aide profile, skills, docs, availability       | WIP    | Detail shows photo, bio, rate, experience, specialties, reviews, hire request. No availability calendar or docs listing surfaced. UI: /marketplace/caregivers/[id]. |
| Operator â†’ Aide contact  | Operator  | Send an initial contact / message to aide           | WIP    | Messaging system exists (/api/messages, /messages). New message picker lists employed caregivers; marketplace "Message" button doesnâ€™t deep link to caregiver. |
| Aide â†’ Operator reply    | Aide      | Respond to operator (basic 2-way communication)     | DONE   | Two-way messaging works with SSE notifications. APIs: /api/messages, /api/messages/threads; UI: /messages. |
| Aide visibility control  | Aide      | Set profile as active/paused in marketplace         | TODO   | No visibility toggle/field on Caregiver or UI to pause/hide from marketplace. |
| Admin aide oversight     | Admin     | List/search aides; view profiles & status           | TODO   | No admin-facing list/search for caregivers; operator endpoints cover only employed caregivers. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done