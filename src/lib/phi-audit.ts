/**
 * HIPAA PHI Audit Logging
 * Call logPhiAccess() whenever protected health information is read, modified,
 * or exported. Writes to the AuditLog table for compliance reporting.
 */

import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export type PhiAction = "READ" | "CREATE" | "UPDATE" | "DELETE" | "EXPORT";

interface PhiAuditOptions {
  userId: string;           // user whose PHI is being accessed
  actionedBy: string;       // user performing the action
  action: PhiAction;
  resourceType: string;     // e.g. "ResidentRecord", "FamilyDocument", "PlacementRequest"
  resourceId?: string;
  description: string;
  request?: NextRequest;
  metadata?: Record<string, unknown>;
}

export async function logPhiAccess(opts: PhiAuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        actionedBy: opts.actionedBy,
        action: opts.action as any,
        resourceType: `PHI:${opts.resourceType}`,
        resourceId: opts.resourceId,
        description: opts.description,
        ipAddress: opts.request
          ? (opts.request.headers.get("x-forwarded-for") ?? opts.request.headers.get("x-real-ip") ?? "unknown")
          : undefined,
        userAgent: opts.request?.headers.get("user-agent") ?? undefined,
        metadata: opts.metadata as any,
      },
    });
  } catch (err) {
    // Never let audit logging failures block the main request
    console.error("[PHI Audit] Failed to write audit log:", err);
  }
}

/**
 * Convenience: log PHI read from an API route handler.
 * Usage: await auditPhiRead(session.user.id, "ResidentRecord", resident.id, "Operator viewed resident health record", request);
 */
export async function auditPhiRead(
  actionedBy: string,
  resourceType: string,
  resourceId: string,
  description: string,
  request: NextRequest,
  subjectUserId?: string
) {
  return logPhiAccess({
    userId: subjectUserId ?? actionedBy,
    actionedBy,
    action: "READ",
    resourceType,
    resourceId,
    description,
    request,
  });
}
