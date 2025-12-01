# CareLinkAI – Phase 1 MVP Status Matrix (Family ↔ Operator Flow)

| Area                     | Role     | Capability                                   | Status | Notes / Gaps |
|--------------------------|----------|----------------------------------------------|--------|--------------|
| Browse listings          | Family   | See list of homes                            | DONE   | Search UI backed by `/api/search` with DB fallback to mocks in dev. |
| Listing filters          | Family   | Filter by location/price                     | DONE   | Supports care level, price, gender, availability, sort, pagination; natural language parsing. |
| View home details        | Family   | Detail page with clear CTA                   | WIP    | Rich UI present; page shows demo only when runtime mock mode is enabled. No DB fetch; not wired to GET /api/homes/[id]. |
| Inquiry/tour form        | Family   | Submit form with required fields             | WIP    | Form exists on home detail; advances local UI only; does not call /api/inquiries. |
| Successful lead creation | Family   | Submission creates backend Lead record       | TODO   | API exists at POST /api/inquiries, but home detail UI is not wired to submit; no persistence from the family flow. |
| Leads list               | Operator | See list of incoming leads                   | DONE   | `/operator/inquiries` lists DB inquiries with filtering by operator scope. |
| Lead status updates      | Operator | Change & persist lead status                 | DONE   | PATCH `/api/operator/inquiries/[id]` updates status (with RBAC). |
| Lead details/notes       | Operator | View full inquiry + add notes                | DONE   | Detail page at /operator/inquiries/[id]; GET + PATCH (/api/operator/inquiries/[id]); notes via PATCH /api/operator/inquiries/[id]/notes. |
| Operator → Family reply  | Operator | Some form of response/messaging              | TODO   | No cross-party messaging implemented. |
| Edit listing             | Operator | Edit listing & reflect changes for families  | WIP    | Edit UI + PATCH API work; search cards reflect DB, but family home detail page is mock-only. |
| AI matching intake       | Family   | Intake → recommended homes list              | DONE   | `/homes/match` posts to `/api/ai/match/resident`; semantic + structured scoring. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done
