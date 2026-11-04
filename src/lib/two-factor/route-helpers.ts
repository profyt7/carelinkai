import type { NextRequest } from 'next/server';
import { AuditAction } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for') || 'unknown';
}

export async function audit2fa(
  req: NextRequest,
  userId: string,
  action: AuditAction,
  description: string,
  metadata: Record<string, unknown> = {},
  resourceType = 'TWO_FACTOR',
) {
  await prisma.auditLog.create({
    data: { action, resourceType, resourceId: userId, description, ipAddress: clientIp(req), metadata: metadata as any, userId, actionedBy: userId },
  });
}

/** Small in-memory limiter (per instance) for code-guessing on authenticated 2FA routes. */
const store = new Map<string, { count: number; first: number; blockedUntil?: number }>();
export function limited(key: string, max = 5, windowMs = 5 * 60_000, blockMs = 15 * 60_000): boolean {
  const now = Date.now();
  const e = store.get(key);
  if (!e || now - e.first > windowMs) { store.set(key, { count: 1, first: now }); return false; }
  if (e.blockedUntil && e.blockedUntil > now) return true;
  e.count += 1;
  if (e.count > max) { e.blockedUntil = now + blockMs; return true; }
  return false;
}
