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
| Provider signup            | Provider  | Create account and log in                        | DONE   | `UserRole.PROVIDER` exists in `prisma/schema.prisma`; API allows PROVIDER and creates linked record: `src/app/api/auth/register/route.ts`; UI exposes Provider option: `src/app/auth/register/page.tsx`. |
| Provider profile           | Provider  | Create/edit profile (name, services, bio, logo)  | DONE   | Provider settings page `/settings/provider`: `src/app/settings/provider/page.tsx`; API GET/PATCH at `src/app/api/provider/profile/route.ts` with validation and audit. |
| Provider services          | Provider  | Define service types & coverage area             | DONE   | Persisted fields: `serviceTypes`, `coverageCity/state/radius` in `Provider` model; editable via `/settings/provider`; sanitized against `MarketplaceCategory` SERVICE slugs in API. |
| Provider availability      | Provider  | Set/update availability (if applicable)          | TODO   | No provider-specific availability; existing page targets caregivers only: `src/app/settings/availability/page.tsx` hitting `/api/caregiver/availability`. |
| Provider documents         | Provider  | Upload licenses/insurance docs                   | TODO   | No provider document upload endpoints/UI on this branch. |
| Provider verification      | Admin     | Mark provider as verified / pending / rejected   | WIP    | Schema fields exist: `isVerified`, `verifiedBy`, `verifiedAt` (`prisma/schema.prisma`); no admin endpoints or UI to action verification. |
| Provider search list       | Operator  | Browse/search list of providers                  | WIP    | UI at `/marketplace/providers`: `src/app/marketplace/providers/page.tsx`; data from mock API `GET /api/marketplace/providers` (mock generator in `src/app/api/marketplace/providers/route.ts`). |
| Provider filters           | Operator  | Filter providers by location, service type, etc. | WIP    | Mock API supports `q, city, state, services, radiusMiles` filters; UI has no filter controls (server fetch only). Results are mock-backed. |
| Provider detail view       | Operator  | View provider profile, services, docs            | WIP    | Page `/marketplace/providers/[id]`: `src/app/marketplace/providers/[id]/page.tsx`; fetches mock-backed API `GET /api/marketplace/providers/[id]`; no real documents. |
| Operator → Provider contact| Operator  | Send initial contact / request to provider       | WIP    | Detail CTA links to `/messages` without provider userId deep-link; messages API supports sending but provider list is mock so no user mapping. |
| Provider → Operator reply  | Provider  | Respond to operator (basic 2-way comms)          | DONE   | Messaging is role-agnostic: `/messages` UI (`src/app/messages/page.tsx`) + `/api/messages` allow any authenticated user (incl. PROVIDER) to read/reply; deep-link via `?userId=` supported. |
| Provider visibility        | Provider  | Set profile as active/paused in marketplace      | WIP    | Field `isVisibleInMarketplace` exists and is editable via `/settings/provider`; marketplace list is mock and does not respect this yet. |
| Admin provider oversight   | Admin     | List/search providers; view profiles & status    | TODO   | No `/api/admin/providers*` or `/admin/providers*` present; only admin caregivers/tools exist. |

Legend:

- TODO = not implemented on this branch
- WIP = partially working, mock-backed, or missing critical pieces
- DONE = implemented and meets the Phase 1 definition of done on this branch