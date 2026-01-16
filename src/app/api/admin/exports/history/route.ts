import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    // Fetch export history for the current user (admins see their own exports)
    const exports = await prisma.exportHistory.findMany({
      where: {
        exportedById: user.id,
      },
      include: {
        exportedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    return NextResponse.json({ exports: exports || [] });
  } catch (error) {
    console.error('Export history fetch error:', error);
    return handleAuthError(error);
  }
}
