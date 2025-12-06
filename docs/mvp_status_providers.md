# CareLinkAI – Phase 1 MVP Status Matrix (Provider Marketplace)

This document reflects the current state of branch `docs/provider-matrix-audit-2025-12-06` only.

Confirmed branch state:
- No `UserRole.PROVIDER` in `prisma/schema.prisma`; no `Provider` model.
- Registration UI/API exclude `PROVIDER` (see `src/app/auth/register/page.tsx`, `src/app/api/auth/register/route.ts`).
- No `/settings/provider` pages or `/api/provider/*` endpoints.
- Provider marketplace APIs under `src/app/api/marketplace/providers*` are mock-backed.
- Marketplace UI uses mock data and lacks real filter controls.
- `/messages` exists and is role-agnostic (generic user-to-user messaging).

| Area                       | Role      | Capability                                       | Status | Notes / Gaps |
|----------------------------|-----------|--------------------------------------------------|--------|--------------|
| Provider signup            | Provider  | Create account and log in                        | TODO   | No PROVIDER role/model in schema; registration UI/API exclude PROVIDER. |
| Provider profile           | Provider  | Create/edit profile (name, services, bio, logo)  | TODO   | No `/settings/provider` UI or `/api/provider/*` endpoints on this branch. |
| Provider services          | Provider  | Define service types & coverage area             | TODO   | No Provider settings UI/API present. |
| Provider availability      | Provider  | Set/update availability (if applicable)          | TODO   | No availability for Provider implemented. |
| Provider documents         | Provider  | Upload licenses/insurance docs                   | TODO   | Not implemented for Provider. |
| Provider verification      | Admin     | Mark provider as verified / pending / rejected   | TODO   | No admin Provider endpoints/UI on this branch. |
| Provider search list       | Operator  | Browse/search list of providers                  | WIP    | UI at `/marketplace/providers`; served from mock API (`/api/marketplace/providers`). |
| Provider filters           | Operator  | Filter providers by location, service type, etc. | WIP    | Filters supported in mock API params; UI lacks real filter controls; results are mock-backed. |
| Provider detail view       | Operator  | View provider profile, services, docs            | WIP    | Page `/marketplace/providers/[id]` uses mock API; CTA links to `/messages`. |
| Operator → Provider contact| Operator  | Send initial contact / request to provider       | WIP    | CTA to `/messages` without user linkage (no provider userId/deep link). |
| Provider → Operator reply  | Provider  | Respond to operator (basic 2-way comms)          | WIP    | Messaging is role-agnostic at `/messages`, but no PROVIDER role exists; cannot represent a Provider replying. |
| Provider visibility        | Provider  | Set profile as active/paused in marketplace      | TODO   | No Provider settings UI/API to control visibility. |
| Admin provider oversight   | Admin     | List/search providers; view profiles & status    | TODO   | No `/api/admin/providers` or `/admin/providers` on this branch. |

Legend:

- TODO = not implemented on this branch
- WIP = partially working, mock-backed, or missing critical pieces
- DONE = implemented and meets the Phase 1 definition of done on this branch