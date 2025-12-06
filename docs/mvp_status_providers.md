# CareLinkAI – Phase 1 MVP Status Matrix (Provider Marketplace)

| Area                  | Role      | Capability                                       | Status | Notes / Gaps |
|-----------------------|-----------|--------------------------------------------------|--------|--------------|
| Provider signup       | Provider  | Create account and log in                        | TODO   | Registration UI/API do not include PROVIDER (src/app/auth/register/page.tsx, src/app/api/auth/register/route.ts). |
| Provider profile      | Provider  | Create/edit profile (name, services, bio, logo)  | DONE   | UI at /settings/provider; API GET/PATCH /api/provider/profile; requires PROVIDER role (signup disabled). |
| Provider services     | Provider  | Define service types & coverage area             | DONE   | serviceTypes + coverageCity/state/radius supported in settings and API. |
| Provider availability | Provider  | Set/update availability (if applicable)          | TODO   | No availability model/UI implemented. |
| Provider documents    | Provider  | Upload licenses/insurance docs                   | TODO   | Not implemented for providers. |
| Provider verification | Admin     | Mark provider as verified / pending / rejected   | DONE   | Admin APIs /api/admin/providers and /api/admin/providers/[id] with UI under /admin/providers. |
| Provider search list  | Operator  | Browse/search list of providers                  | WIP    | UI tab present (/marketplace → Providers); API is mock‑backed (/api/marketplace/providers). |
| Provider filters      | Operator  | Filter providers by location, service type, etc. | WIP    | City/State/Services/Radius/Sort in UI; results from mock backend. |
| Provider detail view  | Operator  | View provider profile, services, docs            | WIP    | Page at /marketplace/providers/[id]; data from mock API. |
| Operator → Provider contact | Operator | Send initial contact / request to provider | WIP    | CTA links to /messages without prefilled userId (no deep link). |
| Provider → Operator reply | Provider | Respond to operator (basic 2-way comms)   | DONE   | Messaging exists; role‑agnostic threads at /messages. |
| Provider visibility   | Provider  | Set profile as active/paused in marketplace      | DONE   | Toggle in settings; admin can override via verification/visibility. |
| Admin provider oversight | Admin  | List/search providers; view profiles & status    | DONE   | Admin list/detail implemented with visibility & verification controls. |

Legend:

- TODO = not validated / not implemented  
- WIP = partially working or needs polish  
- DONE = works and meets the Phase 1 definition of done