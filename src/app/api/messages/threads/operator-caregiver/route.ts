import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const schema = z.object({
  caregiverUserId: z.string().min(1)
});

/**
 * POST /api/messages/threads/operator-caregiver
 * Body: { caregiverUserId: string }
 *
 * Ensures an Operator can open (or create) a direct conversation with a Caregiver.
 * Returns the partner user id to deep-link: /messages?userId=<partnerId>
 *
 * RBAC: Only OPERATOR may initiate via this endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "OPERATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { caregiverUserId } = parsed.data;

    if (caregiverUserId === session.user.id) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }

    // Validate caregiver user exists and is a CAREGIVER
    const caregiverUser = await prisma.user.findUnique({
      where: { id: caregiverUserId },
      select: { id: true, role: true }
    });
    if (!caregiverUser || caregiverUser.role !== "CAREGIVER") {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // In this message model, a "thread" is implicit between two users.
    // We simply return the partner id for deep-linking to /messages?userId=...
    // If there are prior messages, they will render; otherwise the chat opens empty.

    return NextResponse.json({ threadUserId: caregiverUserId });
  } catch (err) {
    console.error("operator-caregiver thread error", err);
    return NextResponse.json({ error: "Failed to prepare conversation" }, { status: 500 });
  }
}
