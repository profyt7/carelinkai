import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    
    // Check if ExportHistory model exists (graceful degradation)
    try {
      const exports = await (prisma as any).exportHistory?.findMany({
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
    } catch (modelError) {
      // Model doesn't exist yet, return empty array
      // This allows the page to work before migration is applied
      return NextResponse.json({ exports: [] });
    }
  } catch (error) {
    return handleAuthError(error);
  }
}
