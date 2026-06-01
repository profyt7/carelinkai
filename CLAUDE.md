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

### Vault references (cross-project / personal context)
A private Obsidian vault is cloned at `/home/user/chrisos-vault`
(GitHub: `profyt7/chrisos-vault`), used for cross-project knowledge:
founder context, financial, legal, personal/family, multi-venture state,
and the CareLinkAI risk register.

At the start of any session that may need vault content, refresh:

```bash
git -C /home/user/chrisos-vault pull --quiet
```

If the vault directory does not exist, notify the user and skip the pull —
do not error out.

Key files to read when relevant:
- `/home/user/chrisos-vault/02_Memory/FOUNDER_PROFILE.md`
- `/home/user/chrisos-vault/02_Memory/CURRENT_STATE.md`
- `/home/user/chrisos-vault/02_Memory/PERSONAL_FAMILY_CONTEXT.md`
- `/home/user/chrisos-vault/02_Memory/FINANCIAL_CONTEXT.md`
- `/home/user/chrisos-vault/02_Memory/LEGAL_DISSOLUTION_CONTEXT.md`
- `/home/user/chrisos-vault/03_Execution/CARELINKAI_RISK_REGISTER.md` —
  premortem risk register, 10 risks scored Sev × Lik. Anything 16+ is
  "fix this quarter." Read before any architecture, compliance, or scope decision.
- `/home/user/chrisos-vault/03_Execution/CARELINKAI_TECH_OPEN_LOOPS.md` —
  vault copy of open loops (may be more current than the repo copy)
- `/home/user/chrisos-vault/03_Execution/WEEK_TRACKER.md` —
  weekly GTM milestone tracking
- `/home/user/chrisos-vault/05_Agent_Logs/DEV_SESSION_SUMMARIES.md`

Canonical-source rules:
- The vault is canonical for cross-project state and the risk register.
- `./context/` in this repo is canonical for code-coupled state
  (technical state, dev session summaries tied to commits).

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

## Branching Discipline (REQUIRED)

Every new feature, fix, or refactor MUST start from a fresh branch off `origin/main`:

    git checkout main && git pull origin main
    git checkout -b feat/<short-description>     # or fix/, chore/, refactor/

NEVER push subsequent work to `claude/review-carelink-docs-49Ycv` or any other
long-running branch that already has accumulated unmerged work. That branch is
effectively a graveyard and pushing more onto it creates the same "month of
mixed workstreams in one PR" problem PR #539 had to clean up via cherry-pick.

If you find yourself on any branch other than a freshly-created one off main,
stop and create the right branch before doing implementation work. This rule
takes priority over any other workflow suggestion.

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
