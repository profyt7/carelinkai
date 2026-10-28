export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/messages/conversations?familyId=...
 *
 * Returns conversation threads for the authenticated user in the shape
 * expected by MessagesTab: { conversations: [...] }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Find all messages involving this user (as sender or receiver)
    const recentMessages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        status: true,
        createdAt: true,
      },
    });

    // Build a map of partnerId → most-recent message
    const partnerMap = new Map<string, { lastMessage: string; lastMessageAt: Date; unreadCount: number }>();

    for (const msg of recentMessages) {
      const partnerId = msg.senderId === userId ? msg.receiverId : msg.senderId;
      if (!partnerMap.has(partnerId)) {
        partnerMap.set(partnerId, {
          lastMessage: msg.content,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }
    }

    if (partnerMap.size === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Count unread per partner
    const partnerIds = Array.from(partnerMap.keys());
    const unreadCounts = await prisma.message.groupBy({
      by: ['senderId'],
      where: {
        senderId: { in: partnerIds },
        receiverId: userId,
        status: { not: 'READ' },
      },
      _count: { id: true },
    });

    for (const row of unreadCounts) {
      const entry = partnerMap.get(row.senderId);
      if (entry) entry.unreadCount = row._count.id;
    }

    // Fetch partner user details
    const partnerUsers = await prisma.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(partnerUsers.map((u) => [u.id, u]));

    const conversations = Array.from(partnerMap.entries())
      .map(([pid, info]) => {
        const user = userMap.get(pid);
        if (!user) return null;
        return {
          userId: pid,
          userFirstName: user.firstName,
          userLastName: user.lastName,
          lastMessage: info.lastMessage,
          lastMessageAt: info.lastMessageAt.toISOString(),
          unreadCount: info.unreadCount,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.lastMessageAt).getTime() - new Date(a!.lastMessageAt).getTime());

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[CONVERSATIONS] Error:', error);
    return NextResponse.json({ conversations: [] });
  }
}
