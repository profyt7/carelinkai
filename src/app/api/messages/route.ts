import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { publish } from "@/lib/server/sse";

// Validate message creation input
const messageCreateSchema = z.object({
  receiverId: z
    .string()
    .min(1, { message: "Receiver ID is required" }),
  content: z.string().min(1, {
    message: "Message content cannot be empty"
  }).max(5000, {
    message: "Message content exceeds maximum length of 5000 characters"
  })
});

/**
 * POST /api/messages
 * 
 * Sends a message to another user and publishes SSE notification
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validationResult = messageCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request parameters", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { receiverId, content } = validationResult.data;
    
    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true }
    });
    
    if (!receiver) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }
    
    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
        status: "SENT"
      }
    });
    
    // Publish SSE event to receiver's notification channel
    publish(`notifications:${receiverId}`, "message:created", {
      messageId: message.id,
      senderId: session.user.id
    });
    
    // Return success response with message data
    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        status: message.status,
        createdAt: message.createdAt
      }
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages
 * 
 * Retrieves messages for the authenticated user
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const otherUserId = searchParams.get("userId");
    const limit = Number(searchParams.get("limit") || "50");
    const before = searchParams.get("before");
    
    // Build where clause
    const whereClause: any = {
      OR: [
        { senderId: session.user.id },
        { receiverId: session.user.id }
      ]
    };
    
    // Filter by conversation if otherUserId provided
    if (otherUserId) {
      whereClause.OR = [
        { senderId: session.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: session.user.id }
      ];
    }
    
    // Add cursor-based pagination
    if (before) {
      whereClause.createdAt = { lt: new Date(before) };
    }
    
    // Query messages
    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100), // Limit to 100 max
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true
          }
        }
      }
    });
    
    // Mark messages as read if they were sent to the current user
    const unreadMessageIds = messages
      .filter(msg => msg.receiverId === session.user.id && msg.status !== "READ")
      .map(msg => msg.id);
    
    if (unreadMessageIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadMessageIds } },
        data: { 
          status: "READ",
          readAt: new Date()
        }
      });
      
      // Publish SSE event for read messages
      publish(`notifications:${session.user.id}`, "message:read", {
        messageIds: unreadMessageIds
      });
    }
    
    // Return messages
    return NextResponse.json({
      messages,
      hasMore: messages.length === limit
    });
    
  } catch (error) {
    console.error("Error retrieving messages:", error);
    return NextResponse.json(
      { error: "Failed to retrieve messages" },
      { status: 500 }
    );
  }
}
