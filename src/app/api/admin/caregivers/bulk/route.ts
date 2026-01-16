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
    const { action, caregiverIds } = body;

    if (!action || !caregiverIds || !Array.isArray(caregiverIds) || caregiverIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: action, caregiverIds (array)' },
        { status: 400 }
      );
    }

    let result: { success: number; failed: number; message: string };

    switch (action) {
      case 'delete':
        result = await handleBulkDelete(caregiverIds, session.user.id);
        break;
      case 'approve':
        result = await handleBulkBackgroundCheck(caregiverIds, 'CLEAR', session.user.id);
        break;
      case 'reject':
        result = await handleBulkBackgroundCheck(caregiverIds, 'CONSIDER', session.user.id);
        break;
      case 'activate':
        result = await handleBulkEmploymentStatus(caregiverIds, 'ACTIVE', session.user.id);
        break;
      case 'deactivate':
        result = await handleBulkEmploymentStatus(caregiverIds, 'INACTIVE', session.user.id);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: 'Caregiver',
      resourceId: null,
      description: `Bulk ${action} on ${caregiverIds.length} caregivers: ${result.success} succeeded, ${result.failed} failed`,
      metadata: {
        bulkAction: action,
        caregiverIds,
        successCount: result.success,
        failedCount: result.failed,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Bulk Caregivers API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(caregiverIds: string[], adminId: string) {
  let success = 0;
  let failed = 0;

  for (const caregiverId of caregiverIds) {
    try {
      // Delete caregiver and associated user if no other roles
      const caregiver = await prisma.caregiver.findUnique({
        where: { id: caregiverId },
        include: { user: true },
      });

      if (caregiver) {
        await prisma.caregiver.delete({ where: { id: caregiverId } });
        // Note: User deletion is handled by cascade or manually based on business rules
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Failed to delete caregiver ${caregiverId}:`, error);
      failed++;
    }
  }

  return {
    success,
    failed,
    message: `Deleted ${success} caregivers${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}

async function handleBulkBackgroundCheck(caregiverIds: string[], status: string, adminId: string) {
  let success = 0;
  let failed = 0;

  for (const caregiverId of caregiverIds) {
    try {
      await prisma.caregiver.update({
        where: { id: caregiverId },
        data: {
          backgroundCheckStatus: status,
          backgroundCheckDate: new Date(),
        },
      });
      success++;
    } catch (error) {
      console.error(`Failed to update caregiver ${caregiverId} background check:`, error);
      failed++;
    }
  }

  const statusLabel = status === 'CLEAR' ? 'Approved' : 'Flagged';
  return {
    success,
    failed,
    message: `${statusLabel} ${success} caregivers${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}

async function handleBulkEmploymentStatus(caregiverIds: string[], status: string, adminId: string) {
  let success = 0;
  let failed = 0;

  for (const caregiverId of caregiverIds) {
    try {
      await prisma.caregiver.update({
        where: { id: caregiverId },
        data: { employmentStatus: status },
      });
      success++;
    } catch (error) {
      console.error(`Failed to update caregiver ${caregiverId} employment status:`, error);
      failed++;
    }
  }

  return {
    success,
    failed,
    message: `${status === 'ACTIVE' ? 'Activated' : 'Deactivated'} ${success} caregivers${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}
