export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

const sendMessageSchema = z.object({
  recipientId: z.string().min(1, 'Recipient is required'),
  subject: z.string().min(1, 'Subject is required').max(200),
  content: z.string().min(1, 'Message content is required').max(10000),
});

// GET - List messages (inbox/sent/all)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'inbox'; // inbox, sent, all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    let whereClause: any = {};

    if (view === 'inbox') {
      whereClause.receiverId = session.user.id;
    } else if (view === 'sent') {
      whereClause.senderId = session.user.id;
    } else {
      // 'all' - show both sent and received for admin
      whereClause.OR = [
        { senderId: session.user.id },
        { receiverId: session.user.id },
      ];
    }

    if (search) {
      whereClause.AND = [
        {
          OR: [
            { subject: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { sender: { firstName: { contains: search, mode: 'insensitive' } } },
            { sender: { lastName: { contains: search, mode: 'insensitive' } } },
            { receiver: { firstName: { contains: search, mode: 'insensitive' } } },
            { receiver: { lastName: { contains: search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
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
          broadcast: {
            select: {
              id: true,
              subject: true,
              targetRole: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where: whereClause }),
    ]);

    // Count unread messages
    const unreadCount = await prisma.message.count({
      where: {
        receiverId: session.user.id,
        status: { not: 'READ' },
      },
    });

    return NextResponse.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = sendMessageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { recipientId, subject, content } = validation.data;

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: recipientId,
        subject,
        content,
        status: 'SENT',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'MESSAGE',
        title: 'New Message from Admin',
        message: `You have received a new message: ${subject}`,
        link: `/messages/${message.id}`,
      },
    });

    // Create audit log
    await createAuditLogFromRequest(
      request,
      session.user.id,
      AuditAction.CREATE,
      'MESSAGE',
      message.id,
      `Admin sent message to ${recipient.firstName} ${recipient.lastName}: ${subject}`
    );

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
