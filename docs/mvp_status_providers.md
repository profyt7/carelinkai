# CareLinkAI – Phase 1 MVP Status Matrix (Provider Marketplace)

| Area                  | Role      | Capability                                       | Status | Notes / Gaps |
|-----------------------|-----------|--------------------------------------------------|--------|--------------|
| Provider signup       | Provider  | Create account and log in                        | WIP    | PROVIDER role added to schema and registration flow; migration pending (DATABASE_URL). Files: prisma/schema.prisma, src/app/api/auth/register/route.ts |
| Provider profile      | Provider  | Create/edit profile (name, services, bio, logo)  | WIP    | Profile API and settings UI implemented; requires DB migration to function. Files: src/app/api/provider/profile/route.ts, src/app/settings/provider/page.tsx |
| Provider services     | Provider  | Define service types & coverage area             | WIP    | serviceTypes + coverage fields persisted on Provider; UI supports selection from marketplace categories. Files: prisma/schema.prisma, src/app/settings/provider/page.tsx |
| Provider availability | Provider  | Set/update availability (if applicable)          | TODO   |              |
| Provider documents    | Provider  | Upload licenses/insurance docs                   | TODO   |              |
| Provider verification | Admin     | Mark provider as verified / pending / rejected   | TODO   |              |
| Provider search list  | Operator  | Browse/search list of providers                  | WIP    | Marketplace pages exist but powered by mock APIs. Files: src/app/marketplace/providers/page.tsx, src/app/api/marketplace/providers/route.ts |
| Provider filters      | Operator  | Filter providers by location, service type, etc. | WIP    | UI/query params supported; DB-backed filtering not wired yet. |
| Provider detail view  | Operator  | View provider profile, services, docs            | WIP    | Detail view exists using mock; needs Provider model wiring. Files: src/app/marketplace/providers/[id]/page.tsx |
| Operator → Provider contact | Operator | Send initial contact / request to provider | TODO   |              |
| Provider → Operator reply | Provider | Respond to operator (basic 2-way comms)   | TODO   |              |
| Provider visibility   | Provider  | Set profile as active/paused in marketplace      | TODO   |              |
| Admin provider oversight | Admin  | List/search providers; view profiles & status    | TODO   |              |

Legend:

- TODO = not validated / not implemented  
- WIP = partially working or needs polish  
- DONE = works and meets the Phase 1 definition of done