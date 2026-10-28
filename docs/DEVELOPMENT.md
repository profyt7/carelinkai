## Development Guide

This guide summarizes common local commands, environment setup, and CI expectations.

### Prerequisites
- Node.js 20+
- Docker + Docker Compose

### First-time setup
1. Copy env file and edit as needed:
```
cp .env.example .env
```
2. Install deps:
```
npm ci
```
3. Generate Prisma Client:
```
npx prisma generate
```
4. Start Postgres + MinIO (optional for local-first):
```
docker compose up -d db minio minio-create-bucket
```

### Running the app
- With Docker (full stack):
```
docker compose up --build
```
Visit http://localhost:5000

- Locally with Next dev server:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/carelinkai_marketplace?schema=public npm run dev
```

### Database
- Create/apply migrations (dev):
```
npx prisma migrate dev --name <change>
```
- Deploy migrations (CI/prod):
```
npx prisma migrate deploy
```
- Seed data:
```
npm run seed
```

### Testing
- Unit tests:
```
npm test
```
- E2E tests (Playwright):
```
npx playwright test
```
E2E config sets `x-e2e-bypass` header and allows bypass via `NEXT_PUBLIC_E2E_AUTH_BYPASS=1` for dev/CI.

### CI
GitHub Actions workflow `.github/workflows/ci.yml` runs lint, typecheck, build, and e2e on PRs and main.
