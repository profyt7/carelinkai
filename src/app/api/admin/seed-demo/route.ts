export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/lib/rbac';
import { runDemoSeed } from '@/lib/demoSeed';

export async function POST(_req: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(['ADMIN' as any]);
    if (error) return error;
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Guard in production: allow only when mock mode cookie is enabled to avoid polluting real data
    if (process.env.NODE_ENV === 'production') {
      // Simple env toggle to allow in production when explicitly permitted by admins
      if (process.env['ALLOW_DEMO_SEED_IN_PROD'] !== '1') {
        return NextResponse.json({ error: 'Demo seed disabled in production' }, { status: 403 });
      }
    }

    const result = await runDemoSeed();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('admin/seed-demo error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
