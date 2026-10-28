# CareLinkAI – Phase 1 MVP Status Matrix (Family ↔ Operator Flow)

**Last Updated:** December 8, 2025 (Post feature/operator-refresh)

## Family → Operator Interaction Flow

| Area                     | Role     | Capability                                   | Status | Notes / Gaps |
|--------------------------|----------|----------------------------------------------|--------|--------------|
| Browse listings          | Family   | See list of homes                            | DONE   | Search UI backed by `/api/search` with DB fallback to mocks in dev. |
| Listing filters          | Family   | Filter by location/price                     | DONE   | Supports care level, price, gender, availability, sort, pagination; natural language parsing. |
| View home details        | Family   | Detail page with clear CTA                   | DONE   | Wired to real data via GET /api/homes/[id]; loading/error states, photos, map, amenities, and inquiry CTAs implemented. |
| Inquiry/tour form        | Family   | Submit form with required fields             | DONE   | Home detail form submits to POST /api/inquiries with validation and success/error states. |
| Successful lead creation | Family   | Submission creates backend Inquiry record    | DONE   | Inquiries are created via POST /api/inquiries and appear in Operator Inquiries list immediately. |
| AI matching intake       | Family   | Intake → recommended homes list              | DONE   | `/homes/match` posts to `/api/ai/match/resident`; semantic + structured scoring. |

## Operator Capabilities (Enhanced in feature/operator-refresh)

| Area                          | Role     | Capability                                        | Status | Notes / Implementation |
|-------------------------------|----------|---------------------------------------------------|--------|------------------------|
| Leads list                    | Operator | See list of incoming home inquiries               | DONE   | `/operator/inquiries` with server-side pagination and filtering (status, home, date range). |
| Lead filtering                | Operator | Filter inquiries by status/home/date              | DONE   | Server-side filtering via query params; date range picker; home dropdown selector. |
| Lead sorting                  | Operator | Sort inquiries by date, status                    | DONE   | Server-side sorting with optimized queries. |
| Lead pagination               | Operator | Navigate large inquiry lists efficiently          | DONE   | Server-side pagination with configurable page size. |
| Lead status updates           | Operator | Change & persist lead status                      | DONE   | Status workflow: NEW → IN_REVIEW → CONTACTED → CLOSED/CANCELLED. PATCH `/api/operator/inquiries/[id]`. |
| Lead details/notes            | Operator | View full inquiry + add internal notes            | DONE   | Detail page at /operator/inquiries/[id]; notes via PATCH /api/operator/inquiries/[id]/notes. |
| View family profile           | Operator | View family contact info from inquiry             | DONE   | Clickable family name links to family profile; shows contact details and inquiry history. |
| **Operator → Family messaging** | **Operator** | **Message families directly from inquiry**      | **DONE** | **"Message Family" button on inquiry detail deep-links to conversation. Contextual messaging integration.** |
| Create home listings          | Operator | Add new assisted living homes                     | DONE   | `/operator/homes/new` with full form: name, address, capacity, amenities, pricing, photos, care levels. |
| Edit listings                 | Operator | Update home details & reflect changes for families| DONE   | Enhanced edit UI at /operator/homes/[id]/edit with all fields; changes reflect in search immediately. |
| Manage home photos            | Operator | Upload, delete, reorder, set primary photo        | DONE   | PhotoGalleryManager component integrated into create/edit pages. Drag-and-drop reordering. |
| View home details             | Operator | See comprehensive home management view            | DONE   | `/operator/homes/[id]` with overview, photos, quick actions, and edit links. |
| Manage residents              | Operator | Create, view, assign residents to homes           | DONE   | `/operator/residents/new` (creation), `/operator/residents/[id]` (detail), list with filters. |
| Operator profile management   | Operator | Edit company info, licenses, contact details      | DONE   | `/settings/operator` page with GET/PATCH `/api/operator/profile`. Edit companyName, taxId, businessLicense. |
| Dashboard overview            | Operator | See KPIs, activity feed, alerts, quick actions    | DONE   | Enhanced `/operator` dashboard with homes count, inquiries, residents, occupancy, recent activity, alerts. |
| Navigation & UX               | Operator | Consistent navigation with breadcrumbs            | DONE   | Universal breadcrumb component; consistent styling; mobile-optimized responsive design. |
| Empty & loading states        | Operator | Professional UX for empty/loading scenarios       | DONE   | EmptyState component and skeleton loaders applied to key pages. |
| Form validation               | Operator | Real-time inline validation with clear errors     | DONE   | Zod schemas with immediate feedback; matches Aide/Provider quality bar. |

## Complete Family ↔ Operator Flow Summary

### Family Journey
1. ✅ Family browses homes via search with filters (location, price, care level, gender, availability)
2. ✅ Family views home detail page with photos, amenities, pricing, and clear CTAs
3. ✅ Family submits inquiry/tour request form with contact details and message
4. ✅ Family can use AI matching for personalized home recommendations
5. ✅ **NEW:** Family receives messages from operators (contextual communication)

### Operator Journey
1. ✅ Operator creates/edits home listings with photos, amenities, pricing, care levels
2. ✅ Operator views incoming inquiries with server-side filtering, sorting, and pagination
3. ✅ Operator reviews inquiry detail with family contact info and message
4. ✅ Operator updates inquiry status through workflow (NEW → IN_REVIEW → CONTACTED → CLOSED)
5. ✅ Operator adds internal notes to track inquiry progress
6. ✅ **NEW:** Operator messages family directly from inquiry detail page
7. ✅ Operator manages residents (create, view, assign to homes)
8. ✅ Operator updates company profile and licenses
9. ✅ Operator monitors dashboard with KPIs, activity feed, and alerts

### Key Enhancements in feature/operator-refresh
- ✅ **Complete CRUD:** Home and resident creation/viewing now fully implemented
- ✅ **Messaging Integration:** Direct "Message Family" button from inquiry detail
- ✅ **Enhanced Filtering:** Server-side filtering by status, home, and date range
- ✅ **Photo Management:** Full gallery with upload, delete, reorder, set primary
- ✅ **Profile Management:** Operators can edit company info and licenses
- ✅ **Professional UX:** Empty states, loading states, breadcrumbs, mobile optimization
- ✅ **Real-time Validation:** Inline form errors with Zod schemas
- ✅ **Responsive Design:** Mobile-optimized tables and forms

### Production Readiness
- ✅ All core Family ↔ Operator workflows functional
- ✅ RBAC properly enforced across all endpoints
- ✅ No critical bugs or missing pages
- ✅ Professional UX matching Aide/Provider quality bar
- ✅ Mobile-responsive across all pages
- ✅ Ready for operator onboarding and family engagement

---

Legend:

- TODO = not validated / not implemented
- WIP = partially working or needs polish
- DONE = works and meets the Phase 1 definition of done
