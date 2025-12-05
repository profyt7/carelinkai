# CareLinkAI – Phase 1 MVP Status Matrix (Provider Marketplace)

| Area                  | Role      | Capability                                       | Status | Notes / Gaps |
|-----------------------|-----------|--------------------------------------------------|--------|--------------|
| Provider signup       | Provider  | Create account and log in                        | TODO   |              |
| Provider profile      | Provider  | Create/edit profile (name, services, bio, logo)  | TODO   |              |
| Provider services     | Provider  | Define service types & coverage area             | TODO   |              |
| Provider availability | Provider  | Set/update availability (if applicable)          | TODO   |              |
| Provider documents    | Provider  | Upload licenses/insurance docs                   | TODO   |              |
| Provider verification | Admin     | Mark provider as verified / pending / rejected   | TODO   |              |
| Provider search list  | Operator  | Browse/search list of providers                  | DONE   | API: `GET /api/marketplace/providers` (Prisma-backed). UI: `/marketplace` (Providers tab) and `/marketplace/providers`. Renders real Provider records (id, name, description, city/state, serviceTypes, coverageRadius). |
| Provider filters      | Operator  | Filter providers by location, service type, etc. | DONE   | Filters wired to DB: `q` (name/bio), `city`, `state`, `services` (array overlap), optional `radiusMiles` with `lat/lng` (approx. city-center distance). Sorting: `distanceAsc` supported when radius provided; rating/price sorts are placeholders until those fields exist. |
| Provider detail view  | Operator  | View provider profile, services, docs            | DONE   | API: `GET /api/marketplace/providers/[id]` (Prisma-backed). UI: `/marketplace/providers/[id]`. Shows name, description, services, coverage area (city/state, radius). Pricing/ratings badges are placeholders for future models. |
| Operator → Provider contact | Operator | Send initial contact / request to provider | TODO   |              |
| Provider → Operator reply | Provider | Respond to operator (basic 2-way comms)   | TODO   |              |
| Provider visibility   | Provider  | Set profile as active/paused in marketplace      | TODO   |              |
| Admin provider oversight | Admin  | List/search providers; view profiles & status    | TODO   |              |

Legend:

- TODO = not validated / not implemented  
- WIP = partially working or needs polish  
- DONE = works and meets the Phase 1 definition of done