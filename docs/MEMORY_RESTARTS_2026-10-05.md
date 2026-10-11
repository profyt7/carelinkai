# Render memory restarts — finding and fix (2026-10-05)

**Symptom.** Render killed the web service for exceeding its memory limit on
2026-10-05 04:05 UTC and 2026-09-13 15:40 UTC. Sentry shows ~40K `GET /`
transactions a day at a flat rate (after 10% sampling — i.e. roughly 4–5
requests/second around the clock), each a full homepage render.

**Verdict: the instance is not simply undersized.** Three in-repo problems
compound; all three are fixed in this PR except the one Render setting that
only the founder can change (health-check path).

## Evidence

| Source | What it shows |
|---|---|
| Sentry event `CARELINK-AI-19` (2026-09-22) | `app_memory: 922742784` — **922 MB RSS** in one Node process, two days into its life (`app_start_time` 09-20). |
| Sentry spans, last 7 days | `GET /` 1,119,350 spans · `middleware GET` 289,820 · next-largest real page `GET /auth/login` 22,580. The homepage is >95% of all traced work. |
| `render.yaml` | `healthCheckPath: /` — Render's health check (plus any uptime monitor) renders the homepage every few seconds. |
| `package.json` → `start` | `NODE_OPTIONS='--max-old-space-size=4096'` — a 4 GB V8 heap cap on an instance that is smaller than that. |
| `grep -rl "new PrismaClient()" src` | **71 files** (route handlers, server pages, libs) each constructed their own `PrismaClient`; **48** of them `$disconnect()` it in a `finally` block after every request. |

## What holds memory

### 1. Prisma client sprawl + per-request reconnect (largest, fixed here)

Each `new PrismaClient()` owns its own query-engine instance and connection
pool. 71 instances means up to 71 engines + 71 pools resident once every route
has been hit at least once (a crawler guarantees that). On top of that, the
`$disconnect()`-in-`finally` pattern tears the engine down after each request,
so the next request **re-spawns** it: constant engine start/stop churn, native
allocations that are not under V8's control, and the `prisma:client:detect_platform`
cold-start spans the perf report shows (each fresh engine re-detects the
platform; concurrent first-queries do it in parallel — see sprint item 6).

**Fix:** every `src/` module now imports the one client from `src/lib/prisma.ts`
(cached on `globalThis` in all environments so separate Next.js server bundles
share it). All per-request `$disconnect()` calls removed. `scripts/` and
`prisma/seed-*.ts` keep their own clients — they are separate short-lived
processes.

### 2. Heap cap above the instance size (fixed here, one env var to set)

With `--max-old-space-size=4096`, V8 sees no reason to collect aggressively
until the heap approaches 4 GB. On a 2 GB (Standard) or 512 MB (Starter)
instance the container is killed long before that. The 922 MB RSS observation
is exactly this: a heap that was allowed to balloon.

**Fix:** `start` now runs `--max-old-space-size=${NODE_HEAP_MB:-1024}`.
Set `NODE_HEAP_MB` in the Render environment to roughly **half of the plan's
RAM** (the rest is the Prisma engine, buffers, and the OS):

| Render plan | RAM | `NODE_HEAP_MB` |
|---|---|---|
| Starter | 512 MB | `256` (and expect to upgrade — 512 MB is tight for Next 15 + Prisma) |
| Standard | 2 GB | `1024` (default — no env var needed) |
| Pro | 4 GB | `2560` |

Once the heap is capped below the instance limit, a genuine leak would surface
as a Node `heap out of memory` crash in the logs instead of a silent Render
kill — which is the diagnosable failure we want.

### 3. Health check / pollers rendering the homepage (fixed here + one Render setting)

`/` is a `'use client'` marketing page with framer-motion; every poll SSRs it
and (10% of the time) ships a Sentry transaction. That is a steady allocation
rate that keeps the GC busy and the quota burning for zero information.

**Fix:**
- New `GET /api/ping` — 200 `{ok:true}`, no Prisma, no session, no React.
  `/api/health` is kept unchanged for the DB-aware check.
- `tracesSampler` (server + edge) drops `/api/ping`, `/api/health`, `HEAD`
  requests, and known uptime-monitor / crawler user agents, so none of that
  traffic is traced any more. Error events are unaffected.
- **Founder action (Render dashboard → Settings → Health Check Path):** set it
  to `/api/ping`. Point any external uptime monitor at the same path.
  `render.yaml` is deliberately left untouched in this PR per the "no Render
  settings changes" rule — update it in the same move.

### Checked and ruled out (for now)

- **SSE** (`src/lib/server/sse.ts`): an in-memory `Map<topic, Set<controller>>`
  plus a 25 s `unref`'d heartbeat per connection; both are released in the
  stream's `cancel()`. Bounded by concurrent logged-in tabs — not a leak unless
  Render's proxy never closes dead connections. Worth a `[SSE]` log count check
  after this deploy, nothing to change yet.
- **In-memory caches**: `mxCache` in `src/lib/email/validate.ts` (one boolean
  per email domain, unbounded but tiny); the Edge rate-limit store is capped at
  10K keys with lazy expiry. Neither explains hundreds of MB.
- **Prisma query logging**: only enabled in development.

## How to confirm after deploy

1. Render → Metrics: memory should plateau instead of climbing between restarts.
2. Sentry → Performance: `GET /` should fall from ~40K/day to real-visitor
   volume; `middleware GET` similar. `prisma:client:detect_platform` should
   disappear from request traces (engine is now created once per process).
3. `curl -I https://getcarelinkai.com/api/ping` → 200 with
   `x-robots-tag: noindex`.
