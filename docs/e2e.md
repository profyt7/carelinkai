# E2E Testing Guide

This document summarizes how to run and extend the Playwright E2E tests for CareLinkAI.

## Quick start

- Install deps and Playwright browsers:
  - `npm ci`
  - `npx playwright install`
- Run all tests locally against the dev server:
  - `npm run dev` (in one terminal)
  - `npx playwright test` (in another).

Tip: Use `PW_USE_START=1 npx playwright test` to run against the production build locally (`npm run start:e2e`).

## Dev endpoints

Tests rely on dev-only endpoints for fast, reliable seeding and login. In CI these are enabled via env vars; locally, use `npm run dev` or `npm run start:e2e` which set:

- `ALLOW_DEV_ENDPOINTS=1`
- `ALLOW_INSECURE_AUTH_COOKIE=1`

Helpers in `e2e/_helpers.ts` wrap these flows (`upsertOperator`, `loginAs`, `getFirstHomeId`, `getFamilyId`, `createResident`, `upsertFamily`, `seedFamilyResident`). Prefer using these helpers instead of manual `page.evaluate` fetch calls.

## CI design

- Workflow: `.github/workflows/e2e-family.yml`
- Runs against a production build for stability (`npm run start`) with dev endpoints enabled.
- Sharding:
  - Residents and Family jobs each run as 2 matrix shards with `--workers=1` per shard to minimize flakiness.
- Retries:
  - CI uses `--retries=1` to smooth out rare, non-deterministic flakes without masking issues.
- Caching:
  - Playwright browsers cached at `~/.cache/ms-playwright`.
  - Next.js build cache at `.next/cache`.
- Artifacts:
  - Shards emit Playwright `blob` reports. A merge job produces a single HTML report artifact named `playwright-report-merged`.
  - `trace`, `screenshot`, `video` are `retain-on-failure` in CI.

### Accessing merged HTML report in CI

- Open the workflow run → Artifacts → download `playwright-report-merged` → open `index.html` locally.

## Conventions

- Prefer server‑verified assertions: when the UI triggers a mutation, poll the corresponding `GET` API briefly to confirm persistence; then reload before asserting UI state.
- Avoid `networkidle` waits due to SSE; use `waitUntil: 'domcontentloaded'` and targeted locators.
- Keep tests deterministic: seed only what the test needs; avoid time‑dependent assumptions.

## Adding new tests

1) Seed via helpers (operator/family). 2) Login via `loginAs(page, email)`. 3) Create entities with helpers. 4) Navigate and assert with robust locators. 5) When mutating, verify via API + reload.

## Troubleshooting

- If a click intermittently fails, ensure the element is scrolled into view and visible, and consider `click({ force: true })` as a last resort.
- If a mutation “does nothing,” verify auth cookies by performing the API check from `page.evaluate` (browser context).
- For flakes, run with `npx playwright test --debug` locally and examine retained traces/videos on CI failures.
