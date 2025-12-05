# CareLinkAI - Phase 1 MVP Status Matrix (Aide / Caregiver Marketplace)

| Area                     | Role      | Capability                                          | Status | Notes / Gaps |
|--------------------------|-----------|-----------------------------------------------------|--------|--------------|
| Aide signup              | Aide      | Create account and log in                           | DONE   | UI: /auth/register, /auth/login; API: /api/auth/register; DB: User. |
| Aide profile basics      | Aide      | Create/edit profile (name, bio, photo)             | DONE   | UI: src/app/settings/profile/page.tsx; API: /api/profile, /api/profile/photo; DB: Caregiver + User. |
| Aide skills & tags       | Aide      | Add skills, certifications, experience              | DONE   | UI: src/app/settings/profile/page.tsx (specialties/settings/careTypes); API: /api/profile; DB: Caregiver.specialties, settings, careTypes. |
| Aide availability        | Aide      | Set/update availability (days/times)                | DONE   | DONE: UI src/app/settings/availability/page.tsx calls API; API src/app/api/caregiver/availability/route.ts implements GET/POST/PUT/DELETE; DB prisma/schema.prisma model AvailabilitySlot; End-to-end wired (UI?API?DB). |
| Aide documents upload    | Aide      | Upload certifications (CPR, CNA, etc.)             | DONE   | UI: src/app/settings/credentials/page.tsx; API: /api/caregiver/credentials (+ /upload-url, /[id]); DB: Credential. |
| Aide verification status | Admin     | Mark aide as verified / pending / rejected          | TODO   | No admin/RBAC endpoints or UI to verify caregivers/credentials. |
| Aide search list         | Operator  | Browse/search list of aides                         | DONE   | UI: /marketplace; API: /api/marketplace/caregivers; DB: Caregiver + User.addresses. |
| Aide filters             | Operator  | Filter aides by location, skills, availability      | DONE   | DONE: UI src/app/marketplace/page.tsx has availableDate/availableStartTime/availableEndTime controls; API src/app/api/marketplace/caregivers/route.ts parses these and filters via prisma.availabilitySlot overlap; DB: AvailabilitySlot. |
| Aide detail view         | Operator  | View aide profile, skills, docs, availability       | WIP    | Data fetch includes availability (7 days) and verified, non-expired credentials in src/app/marketplace/caregivers/[id]/page.tsx; Verify/render calendar + credentials list end-to-end. |
| Operator ? Aide contact  | Operator  | Send an initial contact / message to aide           | WIP    | Messages page src/app/messages/page.tsx supports ?userId deep-link and auto-selects; caregiver detail page lacks Message button linking to /messages?userId={id}. |
| Aide ? Operator reply    | Aide      | Respond to operator (basic 2-way communication)     | DONE   | UI: /messages; API: /api/messages, /api/messages/threads; SSE updates. |
| Aide visibility control  | Aide      | Set profile as active/paused in marketplace         | TODO   | No visibility toggle/field or UI to pause/hide profiles. |
| Admin aide oversight     | Admin     | List/search aides; view profiles & status           | TODO   | No admin-facing caregiver list/search/status views. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done
