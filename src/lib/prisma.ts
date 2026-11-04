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

/**
 * P0-1 (security decision package, Nov 2026): User credential fields are NEVER returned by default.
 * Before this, any `include: { user: true }` (or a bare `findUnique` on User) sent the password hash, 2FA
 * secret, backup codes and email/reset tokens to whoever got the response — e.g.
 * GET /api/operator/inquiries/[id]/convert and GET /api/tours/[id]. With a global `omit`, every query leaves
 * them out unless the caller opts in explicitly with `select: { passwordHash: true }` (auth flows only).
 * Writes and `where` filters on these fields still work.
 */
export const USER_SECRET_FIELDS = {
  passwordHash: true,
  twoFactorSecret: true,
  backupCodes: true,
  verificationToken: true,
  resetPasswordToken: true,
} as const;

const PRISMA_OPTIONS = {
  omit: { user: USER_SECRET_FIELDS },
} as const;

function createPrismaClient() {
  return new PrismaClient({
    ...PRISMA_OPTIONS,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export type AppPrismaClient = ReturnType<typeof createPrismaClient>;

// Define global type for PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: AppPrismaClient | undefined;
}

// Initialize (or reuse) the process-wide client
export const prisma: AppPrismaClient = globalThis.prisma ?? createPrismaClient();

globalThis.prisma = prisma;
