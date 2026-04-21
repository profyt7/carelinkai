# CareLinkAI — Revenue Model
_Last updated: 2026-04-21_

## Target: $10K–$15K MRR by Week 52

---

## The Platform — Who It Serves

| Persona | What they want | Willingness to pay |
|---------|---------------|-------------------|
| **Operators** (assisted living homes) | Qualified leads, operations software, caregiver staffing | High — this is a business tool that directly drives revenue |
| **Families** | Find the right home for a loved one | Low-medium — emotional purchase, price-sensitive |
| **Discharge Planners** | Fast, accurate placement of hospital patients | Medium-high — institutional budget, saves time |
| **Caregivers** | Find shift work or jobs | Low — commodity labor market |

**Conclusion:** Operators are the primary payer. Everything else is either free-to-use (families, caregivers) or a secondary revenue stream (discharge planners).

---

## Revenue Stream 1: Operator SaaS Subscription ⭐ PRIMARY

**What it is:** Monthly fee for operators to access CareLinkAI's full platform — inquiry pipeline, AI responses, resident management, caregiver staffing, compliance tracking, analytics.

**Why it works:** Operators already pay $200-$800/mo for CRM and lead management tools that do far less than CareLinkAI. The AI inquiry response alone saves hours per week.

### Recommended Tiers

| Tier | Price | Homes | What's included |
|------|-------|-------|----------------|
| **Starter** | $99/mo | 1 | Inquiry pipeline, basic resident management, email support |
| **Professional** | $249/mo | Up to 3 | Everything + AI responses, caregiver management, tour scheduling, analytics |
| **Growth** | $499/mo | Up to 10 | Everything + discharge planner integration, advanced analytics, priority support |
| **Enterprise** | Custom | Unlimited | Everything + white-label, API access, dedicated onboarding |

### Path to $10K MRR
- 101 operators on Starter = $9,999/mo
- 40 operators on Professional = $9,960/mo
- 20 operators on Professional + 20 on Starter = $6,960/mo
- **Realistic mix target (Week 52):** 30 Professional + 25 Starter = $9,975/mo ✅

### What needs to be built
- [ ] Stripe subscription checkout flow for operators (Products/Prices in Stripe)
- [ ] `stripeCustomerId` + `stripeSubscriptionId` + `subscriptionPlan` fields on Operator model
- [ ] Subscription-gated feature access (middleware/RBAC check against plan tier)
- [ ] Billing portal page for operators (Stripe Customer Portal or custom)
- [ ] Webhook handlers: `customer.subscription.created/updated/deleted`
- [ ] Free trial (14 days recommended) to reduce friction

---

## Revenue Stream 2: Placement/Referral Fee 💰 HIGH VALUE

**What it is:** One-time fee when a family that found a home through CareLinkAI signs a residency agreement. Paid by the operator.

**Why it works:** Operators already pay referral agencies $2,000-$5,000 per placed resident. CareLinkAI can charge the same or less while offering ongoing software value.

**Pricing:** $500–$2,000 per confirmed placement (or first month's management fee equivalent)

### How it works
1. Family submits inquiry via CareLinkAI
2. Operator converts inquiry to resident (Booking record created)
3. Operator confirms placement in the platform
4. CareLinkAI charges the operator's card automatically via Stripe

### What needs to be built
- [ ] Placement confirmation flow with Stripe charge trigger
- [ ] Clear operator agreement/TOS that includes referral fee
- [ ] PaymentType.PLACEMENT_FEE in schema (currently: DEPOSIT, MONTHLY_FEE, CAREGIVER_PAYMENT)
- [ ] Operator notification + charge receipt

### Risk
Operators may route families "off-platform" to avoid the fee. Mitigation: make the SaaS subscription valuable enough that operators don't want to lose access.

---

## Revenue Stream 3: Caregiver Marketplace Fee 🔄 MEDIUM TERM

**What it is:** Fee when an operator successfully hires a caregiver through the CareLinkAI marketplace.

**Pricing options:**
- Flat placement fee: $250–$500 per hire
- Percentage of first 30-day wages (industry standard: 15-20% = ~$300-$600 for a $15/hr aide working 40hrs/week)

### What's already built
- MarketplaceHire model tracks successful hires
- Stripe Connect is wired for caregiver payouts
- MarketplaceListing, MarketplaceApplication models exist

### What needs to be built
- [ ] Auto-trigger Stripe charge on MarketplaceHire creation
- [ ] Clear pricing displayed to operators pre-hire
- [ ] Caregiver stays free — operators pay

---

## Revenue Stream 4: Discharge Planner SaaS 🏥 GROWTH PHASE

**What it is:** Per-seat monthly subscription for hospital social workers and discharge planners using CareLinkAI's AI placement search.

**Why it works:** Discharge planners place 10-30 patients per month. Every hour saved on placement research is money saved by the hospital. The AI search tool is genuinely differentiated.

**Pricing:** $79–$149/seat/month (institutional buyers, not consumer)

**Target buyers:** 
- Hospital discharge planning departments
- SNF/rehab facility discharge coordinators  
- Geriatric care managers in private practice

### What's already built
- Full discharge planner portal (search, placement requests, history, analytics)
- Role-gated access for DISCHARGE_PLANNER user role
- Demo account exists (demo.provider@carelinkai.test)

### What needs to be built
- [ ] Separate Stripe subscription product for discharge planner seats
- [ ] Institutional billing (invoice by org, multiple seats under one billing account)
- [ ] HIPAA Business Associate Agreement (BAA) — required for hospital contracts

### Note on HIPAA
Any time you're handling patient placement data from a hospital, a BAA is required. This is a legal document, not a technical one. Budget $500-$2,000 for an attorney to draft one before pursuing hospital contracts.

---

## Revenue Stream 5: Premium Listings / Featured Homes 📣 EASY WIN

**What it is:** Operators pay to have their home appear at the top of family search results or in featured sections.

**Pricing:** $49–$99/mo per home

**Why it matters:** Low commitment for operators. Easy upsell on top of a subscription. Families see more relevant results. Good for launch — helps populate the marketplace with engaged operators.

### What needs to be built
- [ ] `isFeatured` flag on AssistedLivingHome model
- [ ] Featured placement logic in search ranking
- [ ] Simple add-on billing (one-time or recurring) in operator billing settings

---

## What NOT to Pursue (Yet)

| Idea | Why not now |
|------|------------|
| Family subscription ("premium search") | Families won't pay to search for care. Free drives adoption. |
| Insurance billing / reimbursement | Requires HIPAA, billing compliance, insurer contracts — years of work |
| Telehealth integration | Out of scope, high complexity, different regulatory environment |
| Advertising/sponsored content | Conflicts with trust; premature before scale |

---

## Revenue Prioritization for Week 1–52

| Phase | Focus | Target MRR |
|-------|-------|-----------|
| Week 1-4 | Get 5 paying operators on Starter ($99) | $495 |
| Week 5-12 | Grow to 20 paying operators (mix of Starter/Pro) | $2,500 |
| Week 13-26 | Scale to 50 operators + activate placement fees | $6,000 |
| Week 27-52 | Scale to 100+ operators + launch discharge planner SaaS | $12,000+ |

---

## Immediate Next Steps for Billing

1. **Render Stripe keys** — confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set in Render
2. **Create Stripe Products** — set up Starter ($99), Professional ($249), Growth ($499) products in Stripe dashboard
3. **Add subscription fields to Operator schema** — `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionPlan`, `subscriptionStatus`, `trialEndsAt`
4. **Build operator subscription checkout** — integrate Stripe Checkout or Payment Element
5. **Wire subscription webhooks** — handle created/updated/deleted lifecycle
6. **Add feature gating** — check plan tier before allowing premium features
