import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { action, userIds } = body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: action, userIds (array)' },
        { status: 400 }
      );
    }

    // Prevent bulk operations on admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        role: 'ADMIN',
      },
      select: { id: true },
    });

    if (adminUsers.length > 0 && action !== 'activate') {
      return NextResponse.json(
        { error: 'Cannot perform bulk operations on admin users' },
        { status: 400 }
      );
    }

    const nonAdminUserIds = userIds.filter(
      (id: string) => !adminUsers.some((admin) => admin.id === id)
    );

    let result: { success: number; failed: number; message: string };

    switch (action) {
      case 'delete':
        result = await handleBulkDelete(nonAdminUserIds, session.user.id);
        break;
      case 'activate':
        result = await handleBulkStatusUpdate(nonAdminUserIds, 'ACTIVE', session.user.id);
        break;
      case 'deactivate':
        result = await handleBulkStatusUpdate(nonAdminUserIds, 'SUSPENDED', session.user.id);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Create audit log for bulk operation
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: 'User',
      resourceId: null,
      description: `Bulk ${action} on ${nonAdminUserIds.length} users: ${result.success} succeeded, ${result.failed} failed`,
      metadata: {
        bulkAction: action,
        userIds: nonAdminUserIds,
        successCount: result.success,
        failedCount: result.failed,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Bulk Users API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(userIds: string[], adminId: string) {
  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      await prisma.user.delete({ where: { id: userId } });
      success++;
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      failed++;
    }
  }

  return {
    success,
    failed,
    message: `Deleted ${success} users${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}

async function handleBulkStatusUpdate(userIds: string[], status: string, adminId: string) {
  let success = 0;
  let failed = 0;

  for (const userId of userIds) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { status },
      });
      success++;
    } catch (error) {
      console.error(`Failed to update user ${userId} status:`, error);
      failed++;
    }
  }

  return {
    success,
    failed,
    message: `${status === 'ACTIVE' ? 'Activated' : 'Deactivated'} ${success} users${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}
