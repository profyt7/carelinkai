# CareLinkAI — Claude Code Instructions

## Mission
You are helping develop and maintain CareLinkAI, an AI-powered assisted living discovery, staffing, and operations platform. The founder is Chris Tolliver (profyt7@gmail.com), Cleveland, OH. This is a bootstrap startup targeting $10K–$15K MRR by Week 52 of the go-to-market plan.

---

## Founder context
Before starting any session, understand who you are working with:

- **Founder:** Chris Tolliver, Cleveland OH — ENTJ, IT professional (SCCM/Tanium), solo founder
- **Mission:** CareLinkAI is not just a business — it's a Cleveland community impact project. Chris sees it as his vehicle to exit his day job and build financial freedom for himself and his daughter Jada.
- **North Star:** Everything filters through being a great dad to Jada (born Aug 2021) and building something real.
- **Working style:** Execution-first. Give him clear next steps, not just options. Direct honesty. He doesn't need to be coddled.
- **Full personal/business context:** `./context/FOUNDER_CONTEXT.md`

---

## Sources of truth
Before making meaningful code changes, read these project-state files (committed to the repo):

- `./context/CARELINKAI_TECHNICAL_STATE.md`
- `./context/CARELINKAI_TECH_OPEN_LOOPS.md`
- `./context/DEV_SESSION_SUMMARIES.md`
- `./context/FOUNDER_CONTEXT.md`

Use them to understand:
- Current architecture and deployment status
- Active priorities
- Known bugs and open loops
- Recent decisions
- What was done in the last session

---

## Tech stack (current)
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (91.7%), JavaScript (6.7%) |
| ORM | Prisma |
| Database | PostgreSQL (hosted on Render) |
| Auth | NextAuth.js |
| Images | Cloudinary |
| Email | Resend |
| Error monitoring | Sentry |
| Styling | Tailwind CSS |
| Real-time | SSE (Server-Sent Events) |
| Payments | Stripe (configured, not yet live) |
| Hosting | Render.com (Docker, auto-deploy from main) |

---

## Development workflow
1. Read CLAUDE.md and context files before starting.
2. Inspect the codebase before proposing major changes — understand before rewriting.
3. For non-trivial work: explain the plan, identify affected files, note risks.
4. Prefer feature branches and PR-ready changes.
5. Do not make destructive changes without explicit confirmation.
6. Summarize every meaningful change at end of session (see end-of-session requirements).

---

## Development rules
- Preserve production stability — Render auto-deploys from main.
- Prefer small, reviewable changes over large rewrites.
- Keep comments concise and useful.
- Document environment assumptions.
- Flag missing secrets, env vars, or services explicitly.
- If architecture is unclear, inspect first and ask second.
- Budget is tight ($4,900 Year 1) — flag anything that adds recurring cost over $20/mo.

---

## Deployment
- GitHub (`profyt7/carelinkai`) is source of truth.
- Render.com is current hosting (Docker, PostgreSQL, auto-deploy from main).
- Validate in preview/staging before production when possible.

---

## Required environment variables
```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
RESEND_API_KEY
EMAIL_FROM
ANTHROPIC_API_KEY
SENTRY_DSN
NEXT_PUBLIC_SENTRY_DSN
```
See `.env.example` for the full documented list with descriptions.

---

## End-of-session requirements
At the end of each dev session, update these three files in `./context/`:

### 1. Append to DEV_SESSION_SUMMARIES.md
Path: `./context/DEV_SESSION_SUMMARIES.md`

Use this format:
```
### YYYY-MM-DD — Session Title
- **Objective:**
- **Work completed:**
- **Files changed:**
- **Commands run:**
- **Tests/build status:**
- **Deployment impact:**
- **New risks/blockers:**
- **Recommended next step:**
```

### 2. Update CARELINKAI_TECHNICAL_STATE.md
Path: `./context/CARELINKAI_TECHNICAL_STATE.md`

Keep current with: architecture changes, active branch/env, hosting status, known issues, recent decisions, immediate next priorities.

### 3. Update CARELINKAI_TECH_OPEN_LOOPS.md
Path: `./context/CARELINKAI_TECH_OPEN_LOOPS.md`

Close completed loops. Add any new ones discovered this session.

---

## Session-start audit prompt
If given no specific task, run this audit first:

1. Read CLAUDE.md and all four `./context/` files above.
2. Report:
   - Current technical state understanding
   - What appears completed
   - What appears unfinished
   - Top 3 highest-leverage next technical tasks
3. Do not change code yet. Audit first.
