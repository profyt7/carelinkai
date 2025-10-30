# Deployment Guide

This document describes how to build and deploy CareLinkAI using GitHub Container Registry (GHCR) and Docker.

## Images

On pushing a tag like `v1.0.0`, GitHub Actions builds and publishes an image:

- `ghcr.io/profyt7/carelinkai:v1.0.0`
- `ghcr.io/profyt7/carelinkai:latest` (for tags starting with `v`)

See `.github/workflows/release.yml`.

## Required environment variables

Set these in your hosting environment:

- `NODE_ENV=production`
- `NEXTAUTH_URL=https://your.domain`
- `NEXTAUTH_SECRET=<random-32+ chars>`
- `DATABASE_URL=postgresql://user:pass@db:5432/carelinkai?schema=public`
- Object storage (MinIO/S3) vars if needed

## Running the container

```
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXTAUTH_URL=https://your.domain \
  -e NEXTAUTH_SECRET=change-me \
  -e DATABASE_URL=postgresql://user:pass@host:5432/carelinkai?schema=public \
  ghcr.io/profyt7/carelinkai:latest
```

## Database migrations

Run migrations on startup (Dockerfile already generates Prisma client at runtime):

```
docker exec <container> npx prisma migrate deploy
```

## Notes

- Ensure TLS is terminated in front of the container or run behind a reverse proxy (nginx, Traefik).
- Configure CSP and security headers appropriately for production (middleware sets sane defaults).
