/**
 * GET /api/homes/[id]/inspections (OL-113 — public)
 *
 * ODH state inspection history for a listing: survey dates, types, citation
 * counts, plain-language citation summaries, and the state source link.
 * Factual public-records data only — no grades, no interpretation. Loaded
 * async by the listing page so it never blocks render.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const MAX_RECORDS = 20;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing home id' }, { status: 400 });
  }

  try {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
      select: { id: true, odhLicenseNumber: true },
    });
    if (!home) {
      return NextResponse.json({ success: false, error: 'Home not found' }, { status: 404 });
    }

    const [records, latestFetch] = await Promise.all([
      prisma.facilityInspection.findMany({
        where: { facilityId: id },
        orderBy: { surveyDate: 'desc' },
        take: MAX_RECORDS,
        select: {
          id: true,
          surveyDate: true,
          surveyType: true,
          citationCount: true,
          citations: true,
          sourceUrl: true,
          fetchedAt: true,
        },
      }),
      // Freshness of our ODH snapshot overall — powers the honest "as of <date>"
      // empty state even when THIS facility has no records.
      prisma.facilityInspection.aggregate({ _max: { fetchedAt: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        odhLicenseNumber: home.odhLicenseNumber,
        records: records.map((r) => ({
          id: r.id,
          surveyDate: r.surveyDate.toISOString().slice(0, 10),
          surveyType: r.surveyType,
          citationCount: r.citationCount,
          citations: Array.isArray(r.citations) ? r.citations : [],
          sourceUrl: r.sourceUrl,
        })),
        // Null until the first ingestion run ever completes.
        dataAsOf: latestFetch._max.fetchedAt ? latestFetch._max.fetchedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Home inspections API error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while fetching inspection history' },
      { status: 500 },
    );
  }
}
