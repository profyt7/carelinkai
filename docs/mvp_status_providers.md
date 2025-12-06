# CareLinkAI – Phase 1 MVP Status Matrix (Provider Marketplace)

| Area                       | Role      | Capability                                       | Status | Notes / Gaps |
|----------------------------|-----------|--------------------------------------------------|--------|--------------|
| Provider signup            | Provider  | Create account and log in                        | TODO   | PROVIDER role exists in Prisma, but signup path is disabled in API/UI. See `src/app/api/auth/register/route.ts` (role enum excludes PROVIDER) and `src/app/auth/register/page.tsx`. |
| Provider profile           | Provider  | Create/edit profile (name, services, bio, logo)  | DONE   | API: GET/PATCH `/api/provider/profile` with validation; UI: `/settings/provider`. Requires existing PROVIDER user. |
| Provider services/coverage | Provider  | Define service types & coverage area             | DONE   | Fields: `serviceTypes`, `coverageCity/state/radius` on `Provider` model. UI controls present in settings. |
| Provider availability      | Provider  | Set/update availability (if applicable)          | TODO   | No provider availability model/UI yet. |
| Provider documents         | Provider  | Upload licenses/insurance docs                   | TODO   | Not implemented for providers. |
| Provider verification      | Admin     | Mark provider as verified / pending / rejected   | DONE   | Fields: `isVerified`, `verifiedBy`, `verifiedAt`; API: Admin GET/PATCH `/api/admin/providers/[id]`; UI: `/admin/providers` and detail page. |
| Provider search list       | Operator  | Browse/search list of providers                  | DONE   | API: DB-backed `/api/marketplace/providers` respects `isVisibleInMarketplace`. UI tab present. |
| Provider filters           | Operator  | Filter providers by location, service type, etc. | DONE   | Supports q/city/state/services; radius uses city-coordinates heuristic; cursor pagination when no radius. |
| Provider detail view       | Operator  | View provider profile, services, docs            | WIP    | `/api/marketplace/providers/[id]` is mock-based; UI detail page loads mock or API depending on id/flags; not fully DB-backed. |
| Operator → Provider contact| Operator  | Send initial contact / request to provider       | WIP    | Messaging exists (`/messages`), but provider detail CTA links to messages without pre-addressing by provider userId. |
| Provider → Operator reply  | Provider  | Respond to operator (basic 2-way comms)          | DONE   | Role-agnostic messaging APIs support replies for PROVIDER users. |
| Provider visibility        | Provider  | Set profile as active/paused in marketplace      | DONE   | Provider toggle in settings; Admin override supported. Stored as `isVisibleInMarketplace`. |
| Admin provider oversight   | Admin     | List/search providers; view profiles & status    | DONE   | Admin list/detail UIs with filters; APIs implemented. |

Legend:

- TODO = not validated / not implemented  
- WIP = partially working or needs polish  
- DONE = works and meets the Phase 1 definition of done

Notes:
- Backend infrastructure is complete for Provider model/APIs and admin oversight, but new PROVIDER users cannot self-register due to signup flow restrictions. Restoring PROVIDER in registration UI/API will unlock end-to-end access.