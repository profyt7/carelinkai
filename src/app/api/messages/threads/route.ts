// Ensure this route is always treated as dynamic (never statically optimized)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/messages/threads
 * 
 * Retrieves conversation threads for the authenticated user
 * Threads are grouped by conversation partner with last message and unread count
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50"),
      100 // Maximum 100 threads
    );

    // Find recent messages to identify conversation partners
    // Get a larger set to ensure we have enough unique partners
    const recentMessages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 500, // Fetch enough to identify unique partners
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        createdAt: true
      }
    });

    // Extract unique conversation partners
    const partners = new Map<string, { lastActivity: Date }>();
    
    for (const message of recentMessages) {
      const partnerId = message.senderId === userId 
        ? message.receiverId 
        : message.senderId;
      
      if (!partners.has(partnerId)) {
        partners.set(partnerId, {
          lastActivity: message.createdAt
        });
      }
    }

    // Get partner IDs sorted by most recent activity
    const partnerIds = Array.from(partners.entries())
      .sort((a, b) => b[1].lastActivity.getTime() - a[1].lastActivity.getTime())
      .slice(0, limit)
      .map(([id]) => id);

    // Fetch thread data for each partner in parallel
    const threadPromises = partnerIds.map(async (partnerId) => {
      // Get partner user details
      const partnerUser = await prisma.user.findUnique({
        where: { id: partnerId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profileImageUrl: true
        }
      });

      if (!partnerUser) {
        return null; // Skip if user not found (shouldn't happen normally)
      }

      // Get last message between current user and partner
      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: userId, receiverId: partnerId },
            { senderId: partnerId, receiverId: userId }
          ]
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          senderId: true,
          receiverId: true,
          content: true,
          status: true,
          createdAt: true
        }
      });

      // Count unread messages from partner to current user
      const unreadCount = await prisma.message.count({
        where: {
          senderId: partnerId,
          receiverId: userId,
          status: { not: "READ" }
        }
      });

      return {
        user: partnerUser,
        lastMessage,
        unreadCount
      };
    });

    // Wait for all thread data to be fetched
    const threads = (await Promise.all(threadPromises)).filter(Boolean);

    // Return threads data
    return NextResponse.json({
      threads,
      total: threads.length
    });

  } catch (error) {
    console.error("Error retrieving message threads:", error);
    return NextResponse.json(
      { error: "Failed to retrieve message threads" },
      { status: 500 }
    );
  }
}
