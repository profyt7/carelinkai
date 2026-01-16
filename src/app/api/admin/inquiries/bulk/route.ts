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
    const { action, inquiryIds, targetStatus } = body;

    if (!action || !inquiryIds || !Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Required: action, inquiryIds (array)' },
        { status: 400 }
      );
    }

    let result: { success: number; failed: number; message: string };

    switch (action) {
      case 'delete':
        result = await handleBulkDelete(inquiryIds, session.user.id);
        break;
      case 'updateStatus':
        if (!targetStatus) {
          return NextResponse.json({ error: 'targetStatus required for updateStatus action' }, { status: 400 });
        }
        result = await handleBulkStatusUpdate(inquiryIds, targetStatus, session.user.id);
        break;
      case 'markContacted':
        result = await handleBulkStatusUpdate(inquiryIds, 'CONTACTED', session.user.id);
        break;
      case 'markResolved':
        result = await handleBulkStatusUpdate(inquiryIds, 'CONVERTED', session.user.id);
        break;
      case 'closeLost':
        result = await handleBulkStatusUpdate(inquiryIds, 'CLOSED_LOST', session.user.id);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    // Create audit log
    await createAuditLog({
      userId: session.user.id,
      action: AuditAction.ADMIN_ACTION,
      resourceType: 'Inquiry',
      resourceId: null,
      description: `Bulk ${action} on ${inquiryIds.length} inquiries: ${result.success} succeeded, ${result.failed} failed`,
      metadata: {
        bulkAction: action,
        inquiryIds,
        targetStatus,
        successCount: result.success,
        failedCount: result.failed,
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Admin Bulk Inquiries API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(inquiryIds: string[], adminId: string) {
  let success = 0;
  let failed = 0;

  for (const inquiryId of inquiryIds) {
    try {
      await prisma.inquiry.delete({ where: { id: inquiryId } });
      success++;
    } catch (error) {
      console.error(`Failed to delete inquiry ${inquiryId}:`, error);
      failed++;
    }
  }

  return {
    success,
    failed,
    message: `Deleted ${success} inquiries${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}

async function handleBulkStatusUpdate(inquiryIds: string[], status: string, adminId: string) {
  let success = 0;
  let failed = 0;

  for (const inquiryId of inquiryIds) {
    try {
      await prisma.inquiry.update({
        where: { id: inquiryId },
        data: { 
          status,
          updatedAt: new Date(),
        },
      });
      success++;
    } catch (error) {
      console.error(`Failed to update inquiry ${inquiryId} status:`, error);
      failed++;
    }
  }

  const statusLabels: Record<string, string> = {
    CONTACTED: 'Marked as Contacted',
    CONVERTED: 'Marked as Resolved',
    CLOSED_LOST: 'Closed as Lost',
  };

  return {
    success,
    failed,
    message: `${statusLabels[status] || `Updated to ${status}`} ${success} inquiries${failed > 0 ? `, ${failed} failed` : ''}`,
  };
}
