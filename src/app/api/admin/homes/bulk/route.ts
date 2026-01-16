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
    const { action, homeIds } = body;

    if (!action || !homeIds || !Array.isArray(homeIds) || homeIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: action, homeIds (array)' },
        { status: 400 }
      );
    }

    let result: { success: number; failed: number; message: string };

    switch (action) {
      case 'delete':
        result = await handleBulkDelete(homeIds, session.user.id);
        break;
      case 'activate':
        result = await handleBulkStatusUpdate(homeIds, 'ACTIVE', session.user.id);
        break;
      case 'deactivate':
        result = await handleBulkStatusUpdate(homeIds, 'INACTIVE', session.user.id);
        break;
      case 'suspend':
        result = await handleBulkStatusUpdate(homeIds, 'SUSPENDED', session.user.id);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: 'Home',
      resourceId: null,
      description: `Bulk ${action} on ${homeIds.length} homes: ${result.success} succeeded, ${result.failed} failed`,
      metadata: {
        bulkAction: action,
        homeIds,
        successCount: result.success,
        failedCount: result.failed,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Bulk Homes API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(homeIds: string[], adminId: string) {
  let success = 0;
  let failed = 0;

  for (const homeId of homeIds) {
    try {
      // Check if home has active residents
      const residentsCount = await prisma.resident.count({
        where: { homeId, status: 'ACTIVE' },
      });

      if (residentsCount > 0) {
        console.log(`Cannot delete home ${homeId}: has ${residentsCount} active residents`);
        failed++;
        continue;
      }

      await prisma.assistedLivingHome.delete({ where: { id: homeId } });
      success++;
    } catch (error) {
      console.error(`Failed to delete home ${homeId}:`, error);
      failed++;
    }
  }

  return {
    success,
    failed,
    message: `Deleted ${success} homes${failed > 0 ? `, ${failed} failed (may have active residents)` : ''}`,
  };
}

async function handleBulkStatusUpdate(homeIds: string[], status: string, adminId: string) {
  let success = 0;
  let failed = 0;

  for (const homeId of homeIds) {
    try {
      await prisma.assistedLivingHome.update({
        where: { id: homeId },
        data: { status },
      });
      success++;
    } catch (error) {
      console.error(`Failed to update home ${homeId} status:`, error);
      failed++;
    }
  }

  const statusLabels: Record<string, string> = {
    ACTIVE: 'Activated',
    INACTIVE: 'Deactivated',
    SUSPENDED: 'Suspended',
  };

  return {
    success,
    failed,
    message: `${statusLabels[status] || status} ${success} homes${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}
