import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction, UserRole, UserStatus } from '@prisma/client';

const broadcastSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  content: z.string().min(1, 'Message content is required').max(10000),
  targetRole: z.enum(['FAMILY', 'OPERATOR', 'CAREGIVER', 'ADMIN', 'AFFILIATE', 'STAFF', 'PROVIDER', 'DISCHARGE_PLANNER', 'ALL']).optional(),
  targetStatus: z.enum(['ACTIVE', 'PENDING', 'ALL']).optional().default('ACTIVE'),
});

// GET - List broadcast history
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.broadcast.count(),
    ]);

    return NextResponse.json({
      broadcasts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Broadcast GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    );
  }
}

// POST - Send broadcast message
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
    const validation = broadcastSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { subject, content, targetRole, targetStatus } = validation.data;

    // Build user filter
    const userFilter: any = {};
    
    if (targetRole && targetRole !== 'ALL') {
      userFilter.role = targetRole as UserRole;
    }

    if (targetStatus && targetStatus !== 'ALL') {
      userFilter.status = targetStatus as UserStatus;
    }

    // Get target users (exclude sender)
    const targetUsers = await prisma.user.findMany({
      where: {
        ...userFilter,
        id: { not: session.user.id },
      },
      select: { id: true },
    });

    if (targetUsers.length === 0) {
      return NextResponse.json(
        { error: 'No users match the specified criteria' },
        { status: 400 }
      );
    }

    // Create broadcast record
    const broadcast = await prisma.broadcast.create({
      data: {
        senderId: session.user.id,
        subject,
        content,
        targetRole: targetRole !== 'ALL' ? (targetRole as UserRole) : null,
        recipientCount: targetUsers.length,
      },
    });

    // Create messages for all recipients in batch
    await prisma.message.createMany({
      data: targetUsers.map(user => ({
        senderId: session.user.id,
        receiverId: user.id,
        subject,
        content,
        status: 'SENT',
        broadcastId: broadcast.id,
      })),
    });

    // Create notifications for all recipients in batch
    await prisma.notification.createMany({
      data: targetUsers.map(user => ({
        userId: user.id,
        type: 'BROADCAST',
        title: 'Admin Announcement',
        message: subject,
        link: '/messages',
      })),
    });

    // Create audit log
    const targetRoleLabel = targetRole === 'ALL' ? 'all users' : `${targetRole} users`;
    await createAuditLogFromRequest(
      request,
      session.user.id,
      AuditAction.CREATE,
      'BROADCAST',
      broadcast.id,
      `Admin sent broadcast to ${targetUsers.length} ${targetRoleLabel}: ${subject}`
    );

    return NextResponse.json({
      success: true,
      broadcast,
      recipientCount: targetUsers.length,
    });
  } catch (error) {
    console.error('Broadcast POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send broadcast' },
      { status: 500 }
    );
  }
}
