export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Credential types that are critical for NEMT operations.
// If any of these expire the provider is auto-deactivated.
const CRITICAL_TYPES = ["BACKGROUND_CHECK", "INSURANCE", "VEHICLE_INSPECTION", "NEMT_LICENSE"];

/**
 * GET /api/cron/credential-expiry
 *
 * Daily cron — mark expired credentials, email providers, deactivate if critical doc expired.
 * Protect with: Authorization: Bearer <CRON_SECRET>  OR  ?secret=<CRON_SECRET>
 * Render cron schedule: 0 6 * * *
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ||
    req.nextUrl.searchParams.get("secret");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // 1. Mark all credentials whose expiresAt has passed as EXPIRED
  const expired = await prisma.providerCredential.updateMany({
    where: {
      status: { in: ["PENDING", "VERIFIED"] },
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // 2. Find providers with a critical expired credential and deactivate them
  const criticalExpired = await prisma.providerCredential.findMany({
    where: {
      status: "EXPIRED",
      type: { in: CRITICAL_TYPES },
    },
    select: { providerId: true, type: true },
  });

  const providerIdsToDeactivate = [...new Set(criticalExpired.map((c) => c.providerId))];
  let deactivated = 0;

  if (providerIdsToDeactivate.length > 0) {
    const result = await prisma.provider.updateMany({
      where: { id: { in: providerIdsToDeactivate }, isActive: true },
      data: { isActive: false },
    });
    deactivated = result.count;
  }

  // 3. Find credentials expiring in the next 30 days for notification
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoon = await prisma.providerCredential.findMany({
    where: {
      status: "VERIFIED",
      expiresAt: { gte: now, lte: thirtyDaysOut },
    },
    include: {
      provider: { select: { businessName: true, contactEmail: true, contactName: true } },
    },
  });

  // Send expiry warning emails
  if (expiringSoon.length > 0 && process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Group by provider to send one email per provider
    const byProvider = new Map<string, typeof expiringSoon>();
    for (const cred of expiringSoon) {
      const arr = byProvider.get(cred.providerId) ?? [];
      arr.push(cred);
      byProvider.set(cred.providerId, arr);
    }

    for (const [, creds] of byProvider) {
      const p = creds[0].provider;
      const lines = creds
        .map((c) => `• ${c.type.replace(/_/g, " ")} — expires ${c.expiresAt!.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`)
        .join("<br>");
      await resend.emails.send({
        from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
        to: [p.contactEmail],
        subject: `Action needed: credentials expiring soon — ${p.businessName}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <p>Hi ${p.contactName},</p>
          <p>The following credential(s) for <strong>${p.businessName}</strong> are expiring within 30 days:</p>
          <p style="margin:16px 0">${lines}</p>
          <p>Please upload updated documents at <a href="${process.env.NEXTAUTH_URL || "https://getcarelinkai.com"}/settings/provider/credentials">your credentials page</a> to avoid disruption to your marketplace listing.</p>
          <p style="color:#9ca3af;font-size:12px">CareLinkAI · Cleveland, OH</p>
        </div>`,
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    ok: true,
    markedExpired: expired.count,
    providersDeactivated: deactivated,
    expiringSoonNotified: expiringSoon.length,
  });
}
