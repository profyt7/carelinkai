export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@prisma/client';

// Resource types classified as PHI for this dashboard
export const PHI_RESOURCE_TYPES = [
  'Resident',
  'Document',
  'ResidentDocument',
  'InquiryDocument',
  'GalleryPhoto',
];

const PHI_DEFAULT_ACTIONS: AuditAction[] = ['READ', 'ACCESS_DENIED'];

function buildWhere(params: URLSearchParams): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  // Default to PHI resource types only
  const resourceTypeParam = params.get('resourceType');
  if (resourceTypeParam) {
    const types = resourceTypeParam.split(',').filter(Boolean);
    where.resourceType = { in: types };
  } else {
    where.resourceType = { in: PHI_RESOURCE_TYPES };
  }

  // Actions — default READ + ACCESS_DENIED
  const actionParam = params.get('action');
  if (actionParam) {
    const actions = actionParam.split(',').filter(Boolean) as AuditAction[];
    where.action = { in: actions };
  } else {
    where.action = { in: PHI_DEFAULT_ACTIONS };
  }

  // Date range — default 7d
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');
  const defaultStart = new Date();
  defaultStart.setDate(defaultStart.getDate() - 7);

  where.createdAt = {
    gte: startDate ? new Date(startDate) : defaultStart,
    ...(endDate ? { lte: new Date(endDate) } : {}),
  };

  // Subject search (resourceId or user email)
  const subject = params.get('subject');
  if (subject) {
    where.OR = [
      { resourceId: { contains: subject, mode: 'insensitive' } },
      { user: { email: { contains: subject, mode: 'insensitive' } } },
      { user: { firstName: { contains: subject, mode: 'insensitive' } } },
      { user: { lastName: { contains: subject, mode: 'insensitive' } } },
    ];
  }

  // Actor filter (email)
  const actorEmail = params.get('actorEmail');
  if (actorEmail) {
    where.user = { email: { contains: actorEmail, mode: 'insensitive' } };
  }

  // Actor role filter
  const actorRole = params.get('actorRole');
  if (actorRole) {
    where.user = {
      ...(where.user as Record<string, unknown> | undefined),
      role: actorRole,
    };
  }

  return where;
}

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
};

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const format = params.get('format'); // 'csv' for export
    const page = Math.max(1, parseInt(params.get('page') || '1', 10));
    const limit = format === 'csv' ? 10_000 : 100;
    const skip = (page - 1) * limit;

    const where = buildWhere(params);

    if (format === 'csv') {
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { user: { select: USER_SELECT } },
      });

      const header = ['timestamp', 'actor_email', 'actor_role', 'action', 'resource_type', 'resource_id', 'ip_address', 'user_agent'].join(',');
      const rows = logs.map((log) => [
        log.createdAt.toISOString(),
        log.user?.email ?? '',
        log.user?.role ?? '',
        log.action,
        log.resourceType,
        log.resourceId ?? '',
        log.ipAddress ?? '',
        (log.userAgent ?? '').replace(/,/g, ';').slice(0, 120),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));

      const csv = [header, ...rows].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="phi-access-${new Date().toISOString().slice(0, 10)}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // JSON response
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: USER_SELECT } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Summary cards — computed from the same where clause (no pagination)
    const [uniqueActors, uniqueSubjects, deniedCount] = await Promise.all([
      prisma.auditLog.groupBy({ by: ['userId'], where, _count: { userId: true } }),
      prisma.auditLog.groupBy({ by: ['resourceId'], where, _count: { resourceId: true } }),
      prisma.auditLog.count({ where: { ...where, action: 'ACCESS_DENIED' } }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalEvents: total,
        uniqueActors: uniqueActors.length,
        uniqueSubjects: uniqueSubjects.length,
        deniedCount,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('phi-access GET error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
