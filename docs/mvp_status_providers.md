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
| Provider signup            | Provider  | Create account and log in                        | TODO   | No `PROVIDER` in `UserRole` and no `Provider` model in `prisma/schema.prisma`; registration API (`src/app/api/auth/register/route.ts`) and UI (`src/app/auth/register/page.tsx`) exclude Provider. |
| Provider profile           | Provider  | Create/edit profile (name, services, bio, logo)  | TODO   | No Provider-facing `/api/provider/*` routes or `/settings/provider` UI. |
| Provider services          | Provider  | Define service types & coverage area             | TODO   | No settings UI/API for Provider serviceTypes/coverage fields on this branch. |
| Provider availability      | Provider  | Set/update availability (if applicable)          | TODO   | No Provider availability; existing availability page targets Caregivers only: `src/app/settings/availability/page.tsx`. |
| Provider documents         | Provider  | Upload licenses/insurance docs                   | TODO   | No Provider document endpoints/UI present. |
| Provider verification      | Admin     | Mark provider as verified / pending / rejected   | WIP    | Endpoints/UI exist: `GET /api/admin/providers`, `GET/PATCH /api/admin/providers/[id]`; pages `/admin/providers`, `/admin/providers/[id]`. However, `Provider` model is absent in schema, so these cannot operate against the DB on this branch. |
| Provider search list       | Operator  | Browse/search list of providers                  | WIP    | `GET /api/marketplace/providers` attempts Prisma-backed queries with `isVisibleInMarketplace && isVerified`; UI `/marketplace/providers` calls this and renders filters. Lacks `Provider` model in schema → not functional end-to-end. |
| Provider filters           | Operator  | Filter providers by location, service type, etc. | WIP    | Client filter controls implemented (q/city/state/services) in `src/app/marketplace/providers/page.tsx`; API accepts these params but relies on missing `Provider` model. |
| Provider detail view       | Operator  | View provider profile, services, docs            | WIP    | Page `src/app/marketplace/providers/[id]/page.tsx` calls `GET /api/marketplace/providers/[id]` (Prisma-backed) → depends on absent `Provider` model. |
| Operator → Provider contact| Operator  | Send initial contact / request to provider       | WIP    | Detail CTA deep-links to `/messages?userId={provider.userId}`, but provider retrieval depends on DB model absent on this branch. Messaging itself works. |
| Provider → Operator reply  | Provider  | Respond to operator (basic 2-way comms)          | WIP    | Messaging system (`/messages`, `/api/messages*`) is role-agnostic, but there is no Provider role or account path; participation would require a regular user mapped to a provider record (missing). |
| Provider visibility        | Provider  | Set profile as active/paused in marketplace      | TODO   | Code references `isVisibleInMarketplace`, but there is no Provider settings UI/API; Admin toggles exist in UI/APIs yet DB model is missing, so no effective persistence. |
| Admin provider oversight   | Admin     | List/search providers; view profiles & status    | WIP    | Admin list/detail pages and APIs exist, but due to missing `Provider` model they are not operational on this branch. |

Legend:

- TODO = not implemented on this branch
- WIP = partially working, mock-backed, or missing critical pieces
- DONE = implemented and meets the Phase 1 definition of done on this branch