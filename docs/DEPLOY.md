# Deploy

This repo ships with:
- Dockerfile for production builds (Next.js 14)
- CI workflow (lint, test, build)
- Release workflow to build/push ghcr.io image on tags
- docker-compose.yml for local run with Postgres

## Local (Docker Compose)

1) Copy env template:
   cp .env.example .env
   # update secrets as needed

2) Start services:
   docker compose up --build

App: http://localhost:3000
Postgres: localhost:5434 (user/password: postgres/postgres)

## Container run (using GHCR image)

After tagging (e.g. v0.2.0), GitHub Actions publishes:
  ghcr.io/OWNER/REPO:latest and ghcr.io/OWNER/REPO:v0.2.0

Run:
  docker run -p 3000:3000 \
    -e NEXTAUTH_URL=https://your-domain \
    -e NEXTAUTH_SECRET=... \
    -e DATABASE_URL=postgresql://... \
    ghcr.io/OWNER/REPO:latest

## Render (staging)

Use the provided render.yaml (Blueprint deploy):
1) On Render: New → Blueprint → Connect this repo → Select render.yaml
2) It will create:
   - Postgres (carelinkai-db)
   - Web Service (Docker) using our Dockerfile
   - NEXTAUTH_SECRET will be generated automatically
   - DATABASE_URL is injected from the DB
3) After the first deploy, set NEXTAUTH_URL to your Render URL (Service → Environment)
4) Redeploy.

Notes:
- The container runs `npx prisma migrate deploy && npm start` on boot to apply DB migrations.
- For non-PHI staging only (Render does not sign a BAA).
