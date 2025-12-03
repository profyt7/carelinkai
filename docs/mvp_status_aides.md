# CareLinkAI — Phase 1 MVP Status Matrix (Aide / Caregiver Marketplace)

| Area                     | Role      | Capability                                          | Status | Notes / Gaps |
|--------------------------|-----------|-----------------------------------------------------|--------|--------------|
| Aide signup              | Aide      | Create account and log in                           | DONE   | Registration supports CAREGIVER role; email verification flow. API: src/app/api/auth/register/route.ts; UI: /auth/register, /auth/login. |
| Aide profile basics      | Aide      | Create/edit profile (name, bio, photo)             | DONE   | Profile edit incl. bio, yearsExperience, hourlyRate, address, photo upload. API: /api/profile, /api/profile/photo; UI: /settings/profile. |
| Aide skills & tags       | Aide      | Add skills, certifications, experience              | DONE   | Caregivers can edit specialties/settings/careTypes at /settings/profile; backend persists via /api/profile. Marketplace filters and detail reflect updates. |
| Aide availability        | Aide      | Set/update availability (days/times)                | DONE   | Full caregiver-facing availability management with CRUD and overlap validation. APIs: /api/caregiver/availability, /api/caregiver/availability/[slotId]; UI: /settings/availability. |
| Aide documents upload    | Aide      | Upload certifications (CPR, CNA, etc.)             | DONE   | Full credentials CRUD with presigned upload. APIs: /api/caregiver/credentials, /api/caregiver/credentials/upload-url, /api/caregiver/credentials/[id]; UI: /settings/credentials. |
| Aide verification status | Admin     | Mark aide as verified / pending / rejected          | TODO   | credential.isVerified fields exist, but no admin/RBAC endpoints or UI to verify caregivers/credentials. |
| Aide search list         | Operator  | Browse/search list of aides                         | DONE   | Marketplace caregiver list implemented. API: /api/marketplace/caregivers; UI: /marketplace (Caregivers tab/cards). |
| Aide filters             | Operator  | Filter aides by location, skills, availability      | DONE   | Filters include q, city/state, radius, rate, experience, specialties, settings, careTypes, and availability (day/time). API: /api/marketplace/caregivers (30-day AvailabilitySlot window); UI: /marketplace. |
| Aide detail view         | Operator  | View aide profile, skills, docs, availability       | DONE   | Shows availability (upcoming slots) and credentials with verification status on detail page. UI: /marketplace/caregivers/[id]. |`r`n| Operator ? Aide contact  | Operator  | Send an initial contact / message to aide           | WIP    | Messaging system exists (/api/messages, /messages). "Message" button on detail links to /messages but doesn’t deep-link to target caregiver/thread. |
| Aide ? Operator reply    | Aide      | Respond to operator (basic 2-way communication)     | DONE   | Two-way messaging works with threads and unread; APIs: /api/messages, /api/messages/threads; UI: /messages. |
| Aide visibility control  | Aide      | Set profile as active/paused in marketplace         | TODO   | No visibility toggle/field on Caregiver and no UI to pause/hide from marketplace. |
| Admin aide oversight     | Admin     | List/search aides; view profiles & status           | TODO   | No admin-facing caregiver list/search or status views. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done


