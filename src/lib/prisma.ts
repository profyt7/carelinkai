/**
 * Prisma Client Singleton
 *
 * ONE PrismaClient per Node process. Every route handler, server component and
 * lib module must import `prisma` from here — never `new PrismaClient()`.
 *
 * Why this matters (memory-restart finding, 2026-10-05): the app used to build
 * ~70 separate PrismaClient instances (one per route file) and `$disconnect()`
 * them in `finally` blocks. Each instance owns its own query-engine state and
 * connection pool, and each reconnect re-spawns the engine — that churn, not
 * traffic, was the biggest resident-memory holder on Render.
 *
 * The instance is cached on `globalThis` in EVERY environment (not only dev):
 * Next.js can evaluate this module more than once per process (separate
 * server bundles for instrumentation / app routes / middleware-adjacent code),
 * and the cache guarantees they all share the same engine + pool.
 *
 * @module lib/prisma
 */

import { PrismaClient } from "@prisma/client";

// Define global type for PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

// Initialize (or reuse) the process-wide client
export const prisma: PrismaClient = globalThis.prisma ?? createPrismaClient();

globalThis.prisma = prisma;
