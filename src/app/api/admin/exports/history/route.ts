import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission, handleAuthError } from '@/lib/auth-utils';
import { PERMISSIONS } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[Export History] API called');
    
    const user = await requirePermission(PERMISSIONS.ADMIN_FULL_ACCESS);
    console.log('[Export History] User authenticated:', user.id, user.email);
    
    // For admin users, show all exports (not just their own)
    // This is more useful for debugging and admin oversight
    const exports = await prisma.exportHistory.findMany({
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
      take: 100,
    });
    
    console.log('[Export History] Found', exports?.length || 0, 'export records');
    
    // Serialize dates for JSON response
    const serializedExports = (exports || []).map(exp => ({
      ...exp,
      completedAt: exp.completedAt?.toISOString() || null,
      createdAt: exp.createdAt?.toISOString() || null,
    }));
    
    return NextResponse.json({ 
      exports: serializedExports,
      count: serializedExports.length 
    });
  } catch (error) {
    console.error('[Export History] Error:', error);
    return handleAuthError(error);
  }
}
