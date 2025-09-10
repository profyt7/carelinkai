import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publish } from "@/lib/server/sse";

/**
 * PUT /api/messages/[id]/read
 * 
 * Marks a message as read and publishes SSE notification
 * Requires authentication and the user must be the message recipient
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Find the message
    const message = await prisma.message.findUnique({
      where: { id },
    });

    // Check if message exists
    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Check if user is the recipient
    if (message.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only mark messages sent to you as read" },
        { status: 403 }
      );
    }

    // If already read, return success (idempotent)
    if (message.status === "READ") {
      return NextResponse.json({ success: true });
    }

    // Update message status to READ
    await prisma.message.update({
      where: { id },
      data: {
        status: "READ",
        readAt: new Date()
      }
    });

    // Publish SSE event
    publish(`notifications:${message.receiverId}`, "message:read", {
      messageId: message.id
    });

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error marking message as read:", error);
    return NextResponse.json(
      { error: "Failed to mark message as read" },
      { status: 500 }
    );
  }
}
