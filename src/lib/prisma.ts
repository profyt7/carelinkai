/**
 * Prisma Client Singleton
 * 
 * This file sets up a singleton instance of the Prisma client to prevent
 * multiple instances during development hot reloading while being efficient in production.
 * 
 * @module lib/prisma
 */

import { PrismaClient } from "@prisma/client";

// Define global type for PrismaClient
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Initialize Prisma Client
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// In development, save the client to avoid multiple instances
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
