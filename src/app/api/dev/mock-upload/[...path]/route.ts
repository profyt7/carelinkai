
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

// Accept any method and body, return 200 OK. Dev/e2e only.
export async function GET() {
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ ok: false, message: 'Only available in development' }, { status: 403 });
  }
  return new NextResponse('', { status: 200 });
}

export async function POST() {
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ ok: false, message: 'Only available in development' }, { status: 403 });
  }
  return new NextResponse('', { status: 200 });
}

export async function PUT() {
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ ok: false, message: 'Only available in development' }, { status: 403 });
  }
  return new NextResponse('', { status: 200 });
}

export async function DELETE() {
  if (process.env.NODE_ENV !== 'development' && process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ ok: false, message: 'Only available in development' }, { status: 403 });
  }
  return new NextResponse('', { status: 200 });
}
