import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

// GET - Get single message
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        broadcast: true,
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Mark as read if user is the receiver
    if (message.receiverId === session.user.id && message.status !== 'READ') {
      await prisma.message.update({
        where: { id: params.id },
        data: { status: 'READ', readAt: new Date() },
      });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Message GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message' },
      { status: 500 }
    );
  }
}

// PATCH - Update message (mark as read/unread)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    const message = await prisma.message.findUnique({
      where: { id: params.id },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check user has access to this message
    if (message.senderId !== session.user.id && message.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    let updatedMessage;

    if (action === 'markAsRead') {
      updatedMessage = await prisma.message.update({
        where: { id: params.id },
        data: { status: 'READ', readAt: new Date() },
      });
    } else if (action === 'markAsUnread') {
      updatedMessage = await prisma.message.update({
        where: { id: params.id },
        data: { status: 'SENT', readAt: null },
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error('Message PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const message = await prisma.message.findUnique({
      where: { id: params.id },
      include: {
        receiver: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check user has access to delete this message
    if (message.senderId !== session.user.id && message.receiverId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await prisma.message.delete({
      where: { id: params.id },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      session.user.id,
      AuditAction.DELETE,
      'MESSAGE',
      params.id,
      `Admin deleted message: ${message.subject || 'No subject'}`
    );

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Message DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
