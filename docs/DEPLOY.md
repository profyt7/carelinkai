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

## Render (optional)

Provide a Postgres and a Web Service. Example spec in render.yaml
