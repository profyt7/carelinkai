# CareLinkAI — Tech Open Loops
_Last updated: 2026-04-23_

## Format
Each loop: what it is, why it matters, what done looks like.

---

## 🔴 Critical (Blocking Revenue / Demos)

### OL-001: Demo accounts not seeded in production
- **Status:** ✅ FIXED (2026-04-22)
- **All 7 accounts active in production (Password: DemoUser123!):**
  - demo.family@carelinkai.test (FAMILY)
  - demo.operator@carelinkai.test (OPERATOR)
  - demo.aide@carelinkai.test (CAREGIVER)
  - demo.provider@carelinkai.test (PROVIDER)
  - demo.admin@carelinkai.test (ADMIN)
  - demo.healthcare@carelinkai.test (DISCHARGE_PLANNER)
  - demo.affiliate@carelinkai.test (AFFILIATE)

### OL-002: ANTHROPIC_API_KEY not set in Render
- **Status:** ✅ FIXED (2026-04-22) — Chris confirmed key is set in Render dashboard
- **Impact was:** All AI features failing in production
- **Done:** CareBot, inquiry AI, document classification, discharge planner, match explainer all live

### OL-004: Revenue model not finalized
- **Status:** Open
- **Impact:** Cannot price the product, cannot bill customers
- **Fix:** Finalize at least the Operator SaaS tier structure; wire Stripe subscription billing
- **Done when:** An operator can sign up, enter a credit card, and be charged a monthly fee

---

## 🟡 Important (Quality / Stability)

### OL-005: 274 TypeScript strict mode errors
- **Status:** Open (CI type-check step disabled as workaround)
- **Impact:** CI pipeline is broken; type safety is unverified
- **Categories:** noPropertyAccessFromIndexSignature (237), noUncheckedIndexedAccess (71), other (65+)
- **Fix:** Systematic pass fixing strict mode violations — can be done in batches
- **Done when:** `npm run type-check` passes with 0 errors and CI step is re-enabled

### OL-006: CI quality workflow type-check step disabled
- **Status:** Workaround in place (type-check commented out in quality.yml)
- **Impact:** CI doesn't catch type errors
- **Fix:** Fix OL-005 first, then re-enable the step
- **File:** `.github/workflows/quality.yml` lines 43-45
- **Done when:** CI passes with type-check enabled

### OL-007: Full end-to-end operator onboarding never verified
- **Status:** ✅ CLOSED (2026-04-23) — all 10 steps verified in production
- All steps passing in production on getcarelinkai.com

### OL-008: Stripe subscription billing not wired (operators)
- **Status:** Open — Stripe one-time payments are wired; recurring subscriptions are not
- **Impact:** Cannot charge operators a monthly SaaS fee
- **Fix:** Create Stripe Products/Prices for operator tiers; wire checkout + webhook for subscription lifecycle
- **Done when:** Operator can subscribe and be billed monthly

---

## 🟢 Low Priority / Future

### OL-013: CareBot outputs raw markdown in chat
- **Status:** Open
- **Impact:** Chat responses show `**bold**` and `---` separators as literal text instead of rendered formatting
- **Fix:** Update CareBot system prompt to write plain text only (same fix applied to inquiry response generator this session)
- **File:** `src/app/api/carebot/chat/route.ts` — update system prompt
- **Done when:** CareBot responses display clean prose in the chat widget

### OL-009: SMS (Twilio) not implemented
- **Status:** Dependency in package.json but no routes
- **Impact:** No SMS notifications to operators/families
- **Fix:** Implement SMS notification triggers for key events (new inquiry, tour reminder)

### OL-010: Invoice model missing from schema
- **Status:** No Prisma model for invoices
- **Impact:** Cannot generate invoices for operators
- **Fix:** Add Invoice model; generate on Stripe subscription payment

### OL-011: Playwright tests configured for localhost only
- **Status:** Tests can't run against production
- **Impact:** No automated regression testing post-deploy
- **Fix:** Create a separate Playwright config for production environment

### OL-012: context/ files were not in repo
- **Status:** ✅ FIXED this session (2026-04-21)
- **Impact was:** Every Claude session started blind with no project state

---

## ✅ Closed Loops

| Loop | Description | Closed |
|------|-------------|--------|
| Email FROM domain | Was `noreply@applyedge.co` | 2026-04-21 |
| .env.example missing 12 vars | Added all required vars | 2026-04-21 |
| context/ directory missing | Created all state files | 2026-04-21 |
| /api/dev/ security | Confirmed gated behind ALLOW_DEV_ENDPOINTS | 2026-04-21 |
| OpenAI build failure | Fixed Dec 19 — dummy key pattern | 2025-12-19 |
| Migration failure (20251218) | Resolved with resolve script | 2025-12-19 |
| CareBot implementation | Built and deployed | 2025-12-30 |
| AI provider consolidation | Migrated all AI from OpenAI+AbacusAI → Anthropic Claude API | 2026-04-21 |
| OL-002: ANTHROPIC_API_KEY | Set in Render dashboard by Chris | 2026-04-22 |
| OL-001: Demo accounts | All 7 accounts seeded in production | 2026-04-22 |
| Profile picture upload (Bug 1) | Fixed CLOUDINARY_URL missing @dygtsnu8z in Render | 2026-04-22 |
| AI matching error (Bug 2) | Was missing OpenAI key — resolved with Anthropic migration | 2026-04-22 |
| Settings routing (Bug 3) | Not a bug — /settings index page works correctly | 2026-04-22 |
| OL-007: Full operator onboarding | All 10 steps verified in production | 2026-04-23 |
| AI Response Generator blank preview | Fixed response wrapper unwrapping in hook | 2026-04-23 |
| Convert to Resident button missing | Wired ConvertInquiryModal into InquiryDetailModal | 2026-04-23 |
| Resident INQUIRY status after convert | Removed spurious status overwrite in conversion service | 2026-04-23 |
| Archive button placeholder text | Wired real ArchiveButton component | 2026-04-23 |
