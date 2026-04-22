# CareLinkAI — Tech Open Loops
_Last updated: 2026-04-21_

## Format
Each loop: what it is, why it matters, what done looks like.

---

## 🔴 Critical (Blocking Revenue / Demos)

### OL-001: Demo accounts not seeded in production
- **Status:** Open
- **Impact:** Cannot demo the product to any prospect
- **Fix:** SSH into Render shell → `npm run seed:demo`
- **Done when:** All 5 demo accounts can log in at carelinkai.onrender.com
- **Accounts:** demo.admin / demo.operator / demo.family / demo.aide / demo.provider @ carelinkai.test / DemoUser123!

### OL-002: ANTHROPIC_API_KEY not set in Render
- **Status:** Open (was OPENAI_API_KEY + ABACUSAI_API_KEY — both replaced by single Anthropic key)
- **Impact:** All AI features fail: CareBot, inquiry responses, document classification, discharge planner search, match explanations, tour scheduling, home profile generation
- **Fix:** Set `ANTHROPIC_API_KEY` in Render dashboard > Environment. Get key from console.anthropic.com.
- **Done when:** CareBot responds and `/api/inquiries/[id]/generate-response` returns AI text in production

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
- **Status:** Open
- **Impact:** Unknown broken flows in the most important user journey
- **Fix:** Do a manual walkthrough: register operator → create home → receive inquiry → AI response → convert
- **Done when:** Full loop works with no errors in production

### OL-008: Stripe subscription billing not wired (operators)
- **Status:** Open — Stripe one-time payments are wired; recurring subscriptions are not
- **Impact:** Cannot charge operators a monthly SaaS fee
- **Fix:** Create Stripe Products/Prices for operator tiers; wire checkout + webhook for subscription lifecycle
- **Done when:** Operator can subscribe and be billed monthly

---

## 🟢 Low Priority / Future

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
