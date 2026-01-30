import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const operator = user.role === UserRole.ADMIN ? null : await prisma.operator.findUnique({ where: { userId: user.id } });
    const where = operator ? { home: { operatorId: operator.id } } : {};
    const shifts = await prisma.caregiverShift.findMany({
      where,
      include: { home: { select: { id: true, name: true } } },
      orderBy: { startTime: 'desc' },
    });
    return NextResponse.json({
      shifts: shifts.map((s) => ({
        id: s.id,
        homeId: s.homeId,
        homeName: s.home?.name || 'Unknown',
        startTime: s.startTime,
        endTime: s.endTime,
        hourlyRate: s.hourlyRate.toString(),
        status: s.status,
        caregiverId: s.caregiverId || null,
      })),
    });
  } catch (e) {
    console.error('[OPERATOR SHIFTS API] Error fetching shifts:', e);
    
    // Provide more specific error messages
    let errorMessage = "Failed to load shifts";
    if (e instanceof Error) {
      if (e.message.includes('timeout') || e.message.includes('ETIMEDOUT')) {
        errorMessage = "Database query timed out. Please try again.";
      } else if (e.message.includes('connect')) {
        errorMessage = "Unable to connect to the database. Please try again later.";
      } else {
        console.error('[OPERATOR SHIFTS API] Full error:', e.stack);
      }
    }
    
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
