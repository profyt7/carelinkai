# Prisma cold start — `prisma:client:detect_platform` p95 8.9 s (2026-10-05)

**Symptom (Sentry, 7-day p95):** `prisma:client:detect_platform` 8.9 s;
`GET /auth/register` 1.8 s; `GET /learn/howto/[slug]` 3.8 s — all inside the
first requests a freshly booted instance serves.

## What the span actually is

In `@prisma/client` 6.19 (`runtime/library.js`, `LibraryEngine.instantiateLibrary`):

```
this.binaryTarget = await this.getCurrentBinaryTarget()   // span "detect_platform"
await runInChildSpan("load_engine", () => this.loadEngine())
```

`getCurrentBinaryTarget()` calls `getBinaryTargetForCurrentPlatform()`, which
reads `/etc/os-release` and **spawns `ldd --version` / `openssl version`
child processes** to decide which engine file to load. Facts that matter:

1. **`binaryTargets` is already pinned** (`prisma/schema.prisma`:
   `binaryTargets = ["debian-openssl-3.0.x"]`) and the matching
   `libquery_engine-debian-openssl-3.0.x.so.node` ships in
   `.next/standalone/node_modules/.prisma/client/`. The pin guarantees the
   right engine is present; **it does not skip detection**. Prisma runs the
   probe once per `PrismaClient` instance no matter what the schema says, and
   there is no env var that bypasses `getCurrentBinaryTarget()`
   (`PRISMA_QUERY_ENGINE_LIBRARY` only skips the *path search* that follows).
2. The result is memoised per process — **but only after the first probe
   finishes**. Concurrent first-queries from several client instances each
   spawn their own probes.
3. Until PR #715, the app had ~71 `PrismaClient` instances (one per route file)
   and `$disconnect()`-ed them after every request. So on a cold instance with
   0.5 vCPU, the first few requests triggered several engines initialising at
   once, each forking `ldd`/`openssl` while Next itself was still JIT-warming.
   That is the 8.9 s.

## Deploy target reality check

`render.yaml` is `runtime: node` (`render-build-verbose.sh` → `npm start` →
`.next/standalone/server.js`), and the Sentry stack traces show
`/opt/render/project/src/.next/standalone/…` — Render's **native Node**
runtime path. The `docker/Dockerfile` is not what Render runs: it is based on
`node:18-alpine` (musl), which would need `linux-musl-openssl-3.0.x`, not the
pinned Debian target, and the image's `HEALTHCHECK` depends on `pg`/`ioredis`.
So "pin the engine in the Docker build" has no effect on production; the
Dockerfile is a stale artifact (logged as an open loop).

## The fix (this PR + #715)

- **#715** — one shared `PrismaClient` per process; no per-request disconnect.
  Detection + engine load now happen **once** per process instead of once per
  route × reconnect.
- **This PR** — `src/lib/prisma-warmup.ts` + `src/instrumentation.ts`:
  `register()` (Next's boot hook, before traffic is accepted) calls
  `prisma.$connect()` with a 15 s cap and never throws. That moves
  `detect_platform` + `load_engine` + the first DB handshake out of the
  request path entirely. Skipped when `DATABASE_URL` is unset (builds, unit
  tests) or `PRISMA_WARMUP=0`.

No query, schema or response changes. Behavior is identical except that the
first request after a deploy no longer pays the engine start.

## How to confirm after deploy

- Render logs on boot: `[Prisma warm-up] engine loaded + connected in N ms`.
- Sentry → Performance → `prisma:client:detect_platform`: should disappear
  from request transactions (it now happens before the server listens). The
  remaining cold-start cost on `/auth/register` / `/learn/howto/[slug]` is
  Next route compilation / JIT, which only an always-warm instance or a
  post-deploy self-ping of the hot routes can remove.
