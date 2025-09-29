# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for CareLinkAI (Next.js 14 + Prisma)

ARG NODE_VERSION=20-alpine

FROM node:${NODE_VERSION} AS base
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# 1) Install deps in a clean layer
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 2) Build stage with dev deps
FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Generate Prisma client and build Next.js
RUN npx prisma generate && npm run build

# 3) Runtime image
FROM base AS runner
RUN apk add --no-cache libc6-compat openssl

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy necessary artifacts from builder/deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Expose port and start
ENV PORT=3000 HOST=0.0.0.0
EXPOSE 3000

# Optionally run migrations on startup if DATABASE_URL is provided
CMD ["sh", "-c", "npx prisma migrate deploy || true; node node_modules/next/dist/bin/next start -p $PORT"]
