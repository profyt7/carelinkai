export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { POST as createInquiry } from '@/app/api/inquiries/route';

export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // Reuse main handler
  return createInquiry(req);
}
