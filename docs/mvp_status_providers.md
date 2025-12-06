# CareLinkAI – Phase 1 MVP Status Matrix (Provider Marketplace)

| Area                  | Role      | Capability                                       | Status | Notes / Gaps |
|-----------------------|-----------|--------------------------------------------------|--------|--------------|
| Provider signup       | Provider  | Create account and log in                        | DONE   | API: `/api/auth/register` now accepts role `PROVIDER` and creates Provider record. UI: `/auth/register` includes Provider option. |
| Provider profile      | Provider  | Create/edit profile (name, services, bio, logo)  | DONE   | API: `GET/PATCH /api/provider/profile` with validation. UI: `/settings/provider` to edit name, bio, logo, services, coverage. Logo upload uses `/api/profile/photo`. |
| Provider services     | Provider  | Define service types & coverage area             | DONE   | Services sourced from `MarketplaceCategory` (SERVICE). Coverage city/state/radius persisted on Provider. |
| Provider availability | Provider  | Set/update availability (if applicable)          | TODO   |              |
| Provider documents    | Provider  | Upload licenses/insurance docs                   | TODO   |              |
| Provider verification | Admin     | Mark provider as verified / pending / rejected   | TODO   |              |
| Provider search list  | Operator  | Browse/search list of providers                  | DONE   | API: `GET /api/marketplace/providers` (Prisma-backed). UI: `/marketplace` (Providers tab) and `/marketplace/providers`. Renders real Provider records (id, name, description, city/state, serviceTypes, coverageRadius). |
| Provider filters      | Operator  | Filter providers by location, service type, etc. | DONE   | Filters wired to DB: `q` (name/bio), `city`, `state`, `services` (array overlap), optional `radiusMiles` with `lat/lng` (approx. city-center distance). Sorting: `distanceAsc` supported when radius provided; rating/price sorts are placeholders until those fields exist. |
| Provider detail view  | Operator  | View provider profile, services, docs            | DONE   | API: `GET /api/marketplace/providers/[id]` (Prisma-backed). UI: `/marketplace/providers/[id]`. Shows name, description, services, coverage area (city/state, radius). Pricing/ratings badges are placeholders for future models. |
| Operator → Provider contact | Operator | Send initial contact / request to provider | DONE   | CTA on `/marketplace/providers/[id]` deep-links to `/messages?userId=<provider.userId>`. APIs now return `userId` in both list and detail: `GET /api/marketplace/providers`, `GET /api/marketplace/providers/[id]`. Messaging via `POST /api/messages`. |
| Provider → Operator reply | Provider | Respond to operator (basic 2-way comms)   | DONE   | PROVIDER users can access `/messages`, see Operator↔Provider threads (via `/api/messages/threads`), and reply using `POST /api/messages`. SSE updates supported. |
| Provider visibility   | Provider  | Set profile as active/paused in marketplace      | TODO   | No visibility field on Provider model; no UI/API to toggle. |
| Admin provider oversight | Admin  | List/search providers; view profiles & status    | TODO   | No admin endpoints or UI for providers found. |

Legend:

- TODO = not validated / not implemented  
- WIP = partially working or needs polish  
- DONE = works and meets the Phase 1 definition of done