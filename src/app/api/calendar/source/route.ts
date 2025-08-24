import { NextRequest, NextResponse } from 'next/server';

// Returns or sets the calendar data source override for the current client.
// Source values:
//  - 'auto'  → follow server env CALENDAR_USE_MOCKS
//  - 'db'    → force database path
//  - 'mocks' → force mock data

const COOKIE_NAME = 'calendar_source';
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(COOKIE_NAME)?.value as 'auto' | 'db' | 'mocks' | undefined;
  // Access env var via index signature to satisfy TypeScript
  const envUsesMocks = ((process.env['CALENDAR_USE_MOCKS'] ?? 'true') as string).toLowerCase() === 'true';
  const effective = cookie && cookie !== 'auto' ? cookie : (envUsesMocks ? 'mocks' : 'db');

  return NextResponse.json({
    success: true,
    data: {
      override: cookie || 'auto',
      effective
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const desired = (body?.source || 'auto') as 'auto' | 'db' | 'mocks';

    if (!['auto', 'db', 'mocks'].includes(desired)) {
      return NextResponse.json({ success: false, error: 'Invalid source' }, { status: 400 });
    }

    const res = NextResponse.json({ success: true, data: { override: desired } });

    // Set or clear cookie
    if (desired === 'auto') {
      res.cookies.delete(COOKIE_NAME);
    } else {
      res.cookies.set(COOKIE_NAME, desired, {
        httpOnly: false,
        path: '/',
        maxAge: ONE_YEAR
      });
    }

    return res;
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to set source' }, { status: 500 });
  }
}
