// Ensure this route is always treated as dynamic (never statically optimized)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/unread
 * 
 * Returns the count of unread messages for the authenticated user
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count unread messages for the current user
    const count = await prisma.message.count({
      where: {
        receiverId: session.user.id,
        OR: [
          { status: { not: "READ" } },
          { readAt: null }
        ]
      }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching unread message count:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
