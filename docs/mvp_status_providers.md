# CareLinkAI – Phase 1 MVP Status Matrix (Provider Marketplace)

| Area                  | Role      | Capability                                       | Status | Notes / Gaps |
|-----------------------|-----------|--------------------------------------------------|--------|--------------|
| Provider signup       | Provider  | Create account and log in                        | TODO   | No PROVIDER role in Prisma enum UserRole (prisma/schema.prisma). Registration API restricts role to FAMILY, OPERATOR, CAREGIVER, AFFILIATE (src/app/api/auth/register/route.ts). No provider-specific auth/flow. |
| Provider profile      | Provider  | Create/edit profile (name, services, bio, logo)  | TODO   | No Provider model or settings UI. Only mock provider data consumed by marketplace; nothing a provider can edit. |
| Provider services     | Provider  | Define service types & coverage area             | TODO   | Mock fields exist in API (services, coverageRadius) but no DB model or provider UI to manage them. |
| Provider availability | Provider  | Set/update availability (if applicable)          | TODO   | No availability model for providers; only caregiver availability exists. |
| Provider documents    | Provider  | Upload licenses/insurance docs                   | TODO   | No provider document upload or storage; caregiver credentials and family documents exist only. |
| Provider verification | Admin     | Mark provider as verified / pending / rejected   | TODO   | No admin verification workflow or status fields for providers. |
| Provider search list  | Operator  | Browse/search list of providers                  | WIP    | UI exists in marketplace Providers tab and dedicated page (src/app/marketplace/page.tsx, src/app/marketplace/providers/page.tsx). API endpoints implemented with mock data only (src/app/api/marketplace/providers/route.ts). No persistence. |
| Provider filters      | Operator  | Filter providers by location, service type, etc. | WIP    | Supports q, city, state, services, radius, sorting in UI and API. Backed by mock data; no real DB filters yet. |
| Provider detail view  | Operator  | View provider profile, services, docs            | WIP    | Detail page exists (src/app/marketplace/providers/[id]/page.tsx) powered by mock API (src/app/api/marketplace/providers/[id]/route.ts). No real docs/profile data. |
| Operator → Provider contact | Operator | Send initial contact / request to provider | TODO   | Generic messaging API exists (src/app/api/messages/route.ts) but providers are not users; "Message provider" link is a placeholder (no receiver mapping). |
| Provider → Operator reply | Provider | Respond to operator (basic 2-way comms)   | TODO   | Blocked by absence of provider user/role and inbox. |
| Provider visibility   | Provider  | Set profile as active/paused in marketplace      | TODO   | No per-provider visibility flag. Only global feature flag NEXT_PUBLIC_PROVIDERS_ENABLED gates the feature. |
| Admin provider oversight | Admin  | List/search providers; view profiles & status    | TODO   | No admin UI or APIs for provider management. |

Legend:

- TODO = not validated / not implemented  
- WIP = partially working or needs polish  
- DONE = works and meets the Phase 1 definition of done