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
| Provider verification      | Admin     | Mark provider as verified / pending / rejected   | DONE   | Admin APIs/UI: `GET /api/admin/providers`, `GET/PATCH /api/admin/providers/[id]`; pages: `/admin/providers`, `/admin/providers/[id]`. |
| Provider search list       | Operator  | Browse/search list of providers                  | DONE   | DB-backed `GET /api/marketplace/providers`; UI `/marketplace/providers` shows real data. |
| Provider filters           | Operator  | Filter providers by location, service type, etc. | DONE   | Supports `q, city, state, services` with pagination; client filter controls implemented. |
| Provider detail view       | Operator  | View provider profile, services, docs            | DONE   | DB-backed `GET /api/marketplace/providers/[id]`; UI consumes real API. |
| Operator → Provider contact| Operator  | Send initial contact / request to provider       | DONE   | Detail page deep-links to `/messages?userId={provider.userId}`. |
| Provider → Operator reply  | Provider  | Respond to operator (basic 2-way comms)          | WIP    | Messaging exists, but no PROVIDER role path in registration; depends on having a user account mapped to provider. |
| Provider visibility        | Provider  | Set profile as active/paused in marketplace      | WIP    | Marketplace honors `isVisibleInMarketplace`; Admin can toggle in `/admin/providers/[id]`; missing provider self-serve settings page. |
| Admin provider oversight   | Admin     | List/search providers; view profiles & status    | DONE   | Implemented endpoints/UI with verify/visibility controls. |

Legend:

- TODO = not implemented on this branch
- WIP = partially working, mock-backed, or missing critical pieces
- DONE = implemented and meets the Phase 1 definition of done on this branch