
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import authOptions from '@/lib/auth';

export async function GET() {
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ ok: false, message: 'Only available in development' }, { status: 403 });
  }
  const session = await getServerSession(authOptions as any);
  return NextResponse.json({ ok: true, session });
}
