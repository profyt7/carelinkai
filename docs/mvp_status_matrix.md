# CareLinkAI – Phase 1 MVP Status Matrix (Family ↔ Operator Flow)

| Area                     | Role     | Capability                                   | Status | Notes / Gaps |
|--------------------------|----------|----------------------------------------------|--------|--------------|
| Browse listings          | Family   | See list of homes                            | DONE   | Search UI backed by `/api/search` with DB fallback to mocks in dev. |
| Listing filters          | Family   | Filter by location/price                     | DONE   | Supports care level, price, gender, availability, sort, pagination; natural language parsing. |
| View home details        | Family   | Detail page with clear CTA                   | DONE   | Wired to real data via GET /api/homes/[id]; loading/error states, photos, map, amenities, and inquiry CTAs implemented. |
| Inquiry/tour form        | Family   | Submit form with required fields             | DONE   | Home detail form submits to POST /api/inquiries with validation and success/error states. |
| Successful lead creation | Family   | Submission creates backend Lead record       | DONE   | Leads are created via POST /api/inquiries and appear in Operator Inquiries list. |
| Leads list               | Operator | See list of incoming leads                   | DONE   | `/operator/inquiries` lists DB inquiries with filtering by operator scope. |
| Lead status updates      | Operator | Change & persist lead status                 | DONE   | PATCH `/api/operator/inquiries/[id]` updates status (with RBAC). |
| Lead details/notes       | Operator | View full inquiry + add notes                | DONE   | Detail page at /operator/inquiries/[id]; GET + PATCH (/api/operator/inquiries/[id]); notes via PATCH /api/operator/inquiries/[id]/notes. |
| Operator → Family reply  | Operator | Some form of response/messaging              | TODO   | No cross-party messaging implemented. |
| Edit listing             | Operator | Edit listing & reflect changes for families  | DONE   | Edit UI at /operator/homes/[id]/edit patches /api/operator/homes/[id]; changes reflect in search and Family home detail. |
| AI matching intake       | Family   | Intake → recommended homes list              | DONE   | `/homes/match` posts to `/api/ai/match/resident`; semantic + structured scoring. |

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done
