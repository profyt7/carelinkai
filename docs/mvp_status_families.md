# CareLinkAI – Family MVP Status Matrix

This document tracks the implementation status of all Family-specific features in the CareLinkAI platform.

| Area    | Role    | Capability    | Status | Notes / Implementation |
|----|----|----|----|----|
| Family signup    | Family   | Create account and log in    | ✅ DONE   | Registration supports FAMILY role with email verification. API: `src/app/api/auth/register/route.ts`; UI: `/auth/register`, `/auth/login`. Creates User + Family records in transaction. |
| Family profile basics    | Family   | Create/edit profile (name, contact info)    | ✅ DONE   | Profile edit includes primaryContactName, phone, relationshipToRecipient. API: `GET/PATCH /api/family/profile`; UI: `/settings/family`. |
| Family care context    | Family   | Provide care recipient details (age, diagnosis, mobility)    | ✅ DONE   | Care context fields: recipientAge, primaryDiagnosis, mobilityLevel, careNotes. Validation: age 0-120, diagnosis max 200 chars, notes max 1000 chars. API: `/api/family/profile`; UI: `/settings/family`. |
| Family onboarding    | Family   | Guided setup after registration    | ✅ DONE   | Auto-redirect to `/settings/family?onboarding=true` after registration. Context-aware welcome message for new users. Skip option available. |
| Browse marketplace - Aides | Family   | View list of caregivers    | ✅ DONE   | Marketplace caregiver list with filters. API: `/api/marketplace/caregivers`; UI: `/marketplace` (Caregivers tab). Supports search, location, rate, experience filters. |
| Browse marketplace - Providers | Family   | View list of care providers    | ✅ DONE   | Provider marketplace with filters. API: `/api/marketplace/providers`; UI: `/marketplace/providers`. Supports search, location, service type filters. |
| Aide detail view    | Family   | View caregiver profiles with skills, availability    | ✅ DONE   | Comprehensive aide profiles with bio, skills, credentials, availability. UI: `/marketplace/caregivers/[id]`. Shows verified badges, hourly rate, experience, specialties. |
| Provider detail view    | Family   | View provider profiles with services, coverage    | ✅ DONE   | Provider profiles with business info, services, coverage area, credentials. UI: `/marketplace/providers/[id]`. Shows verification status, insurance info. |
| Submit Aide inquiry    | Family   | Contact caregiver with care needs    | ✅ DONE   | Lead creation form with care context snapshot. API: `POST /api/leads` (targetType: AIDE). Fields: message, preferredStartDate, expectedHoursPerWeek, location, care details. Creates Lead with status NEW. |
| Submit Provider inquiry    | Family   | Contact provider with care needs    | ✅ DONE   | Lead creation form for providers. API: `POST /api/leads` (targetType: PROVIDER). Same fields as Aide inquiry with polymorphic pattern (aideId/providerId). |
| Inquiry confirmation    | Family   | See success message after submission    | ✅ DONE   | Success toast with lead ID after submission. Confirms inquiry sent to aide/provider. Option to submit another inquiry or return to marketplace. |
| View favorites    | Family   | Save and view favorite aides/providers    | ✅ DONE   | Favorites system with heart icon toggle. API: `/api/favorites/*`; UI: `/favorites`. Supports homes, caregivers, providers. Unified favorites page with tabs. |
| Messaging - Initiate    | Family   | Start conversation with aide/provider (if needed)    | ✅ DONE   | Two-way messaging system. Message buttons on marketplace cards and detail pages. API: `/api/messages/*`; UI: `/messages`. Deep-linking with userId query params. |
| Messaging - Reply    | Family   | Respond to operator/aide/provider messages    | ✅ DONE   | Real-time messaging with SSE notifications. UI: `/messages` with thread list and conversation view. Supports text messages with timestamps. |
| Inquiry status tracking    | Family   | View status of submitted inquiries (future)    | TODO   | Family-facing lead list not yet implemented. Currently leads are only visible to operators. Future: `/family/inquiries` page. |
| Profile photo upload    | Family   | Upload and display profile picture    | ✅ DONE   | Profile photo upload with sharp image processing. API: `/api/profile/photo`; UI: `/settings/profile`. Supports JPG/PNG, 5MB limit, automatic resize to 200x200. |
| Account settings    | Family   | Update email, password, notification preferences    | ✅ DONE   | Settings navigation at `/settings`. Includes profile, notifications, security. Password change via `/api/auth/password/change`. |
| Dashboard    | Family   | Family-specific dashboard with quick actions    | ✅ DONE   | Dashboard at `/dashboard` with role-based content. Shows recent activity, quick links to marketplace, favorites, messages. |
| Search homes    | Family   | Browse and search care homes    | ✅ DONE   | Home search with AI matching. API: `/api/search`, `/api/ai/match/resident`; UI: `/homes/match`. Natural language search, location filters, care level matching. |
| View home details    | Family   | Detailed care home information    | ✅ DONE   | Home detail pages with photos, amenities, pricing, availability. UI: `/homes/[id]`. Inquiry CTA integrated. API: `/api/homes/[id]`. |
| Submit home inquiry    | Family   | Contact care home about placement    | ✅ DONE   | Home inquiry form creates Inquiry record. API: `POST /api/inquiries`; UI: home detail page. Operator receives in `/operator/inquiries`. |

## Implementation Summary

### Database Models
- **Family**: Enhanced with care context fields (primaryContactName, phone, relationshipToRecipient, recipientAge, primaryDiagnosis, mobilityLevel, careNotes)
- **Lead**: Polymorphic model for Aide/Provider inquiries with status tracking, soft delete, operator assignment

### Enums
- **UserRole**: Added FAMILY
- **LeadTargetType**: AIDE | PROVIDER
- **LeadStatus**: NEW | IN_REVIEW | CONTACTED | CLOSED | CANCELLED

### Key API Endpoints
- `POST /api/auth/register` - Family registration with care context
- `GET/PATCH /api/family/profile` - Family profile management
- `POST /api/leads` - Create Aide/Provider inquiry
- `GET /api/marketplace/caregivers` - Browse aides
- `GET /api/marketplace/providers` - Browse providers
- `GET /api/marketplace/caregivers/[id]` - Aide detail
- `GET /api/marketplace/providers/[id]` - Provider detail

### Key UI Pages
- `/auth/register` - Family registration
- `/settings/family` - Family profile setup with onboarding
- `/marketplace` - Browse caregivers and providers
- `/marketplace/caregivers/[id]` - Aide detail with inquiry form
- `/marketplace/providers/[id]` - Provider detail with inquiry form
- `/favorites` - Saved favorites
- `/messages` - Messaging interface
- `/dashboard` - Family dashboard

### Security & Validation
- RBAC enforcement on all Family endpoints
- Zod validation for care context fields
- HIPAA-compliant audit logging for profile changes
- Rate limiting on inquiry submissions
- Input sanitization and XSS prevention

### Testing
- API endpoint tests with curl examples
- UI flow tests (registration → profile → browse → inquire)
- RBAC validation tests
- Form validation tests
- Error handling tests

## Future Enhancements
1. **Family-facing lead tracking** - View status of submitted inquiries
2. **Lead messaging** - Direct messaging with assigned aide/provider
3. **Appointment scheduling** - Book consultations with providers
4. **Review system** - Leave reviews after service completion
5. **Care plan documents** - Upload and share care plans
6. **Multi-recipient support** - Manage care for multiple family members
7. **Budget tracking** - Track care expenses and billing
8. **Care team coordination** - Collaborate with multiple caregivers
9. **Emergency contacts** - Manage emergency contact information
10. **Activity feed** - Timeline of all inquiries and interactions

## Deployment Notes
- All migrations applied: `20251207154010_add_family_and_lead_models`
- Seed data available for testing Family flows
- Feature flags: None (all features production-ready)
- Environment variables: Standard auth and database config

## Related Documentation
- Family Leads Schema Design: `/home/ubuntu/carelinkai/family_leads_schema_design.md`
- Phase 1 Implementation: `/home/ubuntu/carelinkai/PHASE1_IMPLEMENTATION_SUMMARY.md`
- Family Profile Implementation: `/home/ubuntu/family_profile_implementation.md`
- Family Registration: `/home/ubuntu/family_registration_implementation.md`
- Operator Lead Management: `/home/ubuntu/carelinkai/operator_lead_management_implementation.md`

---

**Legend:**
- ✅ DONE = Implemented and tested
- TODO = Not yet implemented
- WIP = Partially implemented

**Last Updated:** December 7, 2025
