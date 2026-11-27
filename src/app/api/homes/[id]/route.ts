export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createAuditLogFromRequest } from '@/lib/audit';
import { loadHomeDetail } from '@/lib/homes/home-detail';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing home id' },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions);

    const viewerEmail = (session?.user?.email as string | undefined) ?? null;
    const data = await loadHomeDetail(id, viewerEmail);
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Home not found' },
        { status: 404 }
      );
    }

    // Best-effort audit log (non-blocking)
    await createAuditLogFromRequest(
      req,
      'READ' as any,
      'AssistedLivingHome',
      data.id,
      `Viewed home details: ${data.name}`,
      { availabilityVerified: data.availabilityFreshness.fresh }
    );

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('Home detail API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred while fetching home details',
        details: process.env['NODE_ENV'] === 'development' ? String((error as any)?.message ?? error) : undefined,
      },
      { status: 500 }
    );
  }
}
