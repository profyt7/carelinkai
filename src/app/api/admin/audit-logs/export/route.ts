import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') as AuditAction | null;
    const userId = searchParams.get('userId');
    const resourceType = searchParams.get('resourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause
    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.userId = userId;
    }

    if (resourceType) {
      where.resourceType = resourceType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch all matching logs
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        actionedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Create audit log for export action
    await createAuditLogFromRequest(request, {
      action: AuditAction.EXPORT,
      resourceType: 'AUDIT_LOG',
      resourceId: 'export',
      description: `Exported ${logs.length} audit logs`,
      metadata: { filters: { action, userId, resourceType, startDate, endDate } },
    });

    // Convert to CSV
    const csvHeader = 'ID,Action,User Email,User Name,User Role,Resource Type,Resource ID,Description,IP Address,Created At,Actioned By Email,Actioned By Name\n';
    const csvRows = logs.map(log => {
      const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : 'N/A';
      const actionedByName = log.actionedByUser 
        ? `${log.actionedByUser.firstName} ${log.actionedByUser.lastName}` 
        : 'N/A';
      const actionedByEmail = log.actionedByUser?.email || 'N/A';
      
      return [
        log.id,
        log.action,
        log.user?.email || 'N/A',
        `"${userName}"`,
        log.user?.role || 'N/A',
        log.resourceType,
        log.resourceId || 'N/A',
        `"${log.description.replace(/"/g, '""')}"`,
        log.ipAddress || 'N/A',
        log.createdAt.toISOString(),
        actionedByEmail,
        `"${actionedByName}"`,
      ].join(',');
    });

    const csv = csvHeader + csvRows.join('\n');
    
    const fileName = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
