/**
 * GET /api/cron/odh-inspections (OL-113)
 *
 * Monthly refresh of ODH RCF survey/citation records: fetches the normalized
 * bulk file from ODH_INSPECTIONS_SOURCE_URL and ingests it (writes enabled).
 * Matching policy + review-queue semantics live in src/lib/inspections/.
 *
 * Guards (claim-drip lesson — nothing autonomous runs until verified):
 *   - Authorization: Bearer <CRON_SECRET>
 *   - ODH_INGEST_ENABLED must be truthy ("1"/"true") — default OFF
 *   - ODH_INSPECTIONS_SOURCE_URL must be set to a verified JSON/CSV URL
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestOdhRecords, parseOdhInput } from '@/lib/inspections/ingest';

function flagEnabled(v: string | undefined): boolean {
  return v === '1' || v?.toLowerCase() === 'true';
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!flagEnabled(process.env.ODH_INGEST_ENABLED)) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: 'ODH_INGEST_ENABLED is off (default). Set ODH_INGEST_ENABLED=1 after verifying the source.',
    });
  }

  const sourceUrl = process.env.ODH_INSPECTIONS_SOURCE_URL;
  if (!sourceUrl) {
    return NextResponse.json(
      { ok: false, error: 'ODH_INSPECTIONS_SOURCE_URL is not set — see docs/ODH_INSPECTION_DATA_SOURCE.md' },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(sourceUrl, {
      headers: { accept: 'application/json, text/csv;q=0.9, */*;q=0.5' },
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Source fetch failed: HTTP ${res.status} (ohio.gov WAF may block this egress — use the --input script path instead)` },
        { status: 502 },
      );
    }
    const records = parseOdhInput(await res.text());
    const summary = await ingestOdhRecords(prisma, records, { force: true });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'ODH ingest failed' },
      { status: 500 },
    );
  }
}
