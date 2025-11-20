export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DEV-ONLY endpoint to seed assessments and incidents for a resident in a single transaction.
// Enabled only when ALLOW_DEV_ENDPOINTS=1

type AssessmentInput = { type: string; score?: number | null; data?: any };
type IncidentInput = { type: string; severity: string; description?: string | null; occurredAt: string };

export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const residentId: string | undefined = body.residentId;
    if (!residentId) return NextResponse.json({ error: 'residentId required' }, { status: 400 });
    const assessments: AssessmentInput[] = Array.isArray(body.assessments) ? body.assessments : [];
    const incidents: IncidentInput[] = Array.isArray(body.incidents) ? body.incidents : [];

    const result = await prisma.$transaction(async (tx) => {
      const createdAssessments: string[] = [];
      const createdIncidents: string[] = [];
      for (const a of assessments) {
        const created = await tx.assessmentResult.create({
          data: { residentId, type: a.type, score: a.score ?? null, data: a.data ?? null },
          select: { id: true },
        });
        createdAssessments.push(created.id);
      }
      for (const i of incidents) {
        const created = await tx.residentIncident.create({
          data: { residentId, type: i.type, severity: i.severity, description: i.description ?? null, occurredAt: new Date(i.occurredAt) },
          select: { id: true },
        });
        createdIncidents.push(created.id);
      }
      return { createdAssessments, createdIncidents };
    });

    // Confirm visibility via fresh reads to avoid any timing issues in callers
    const [assessAfter, incidentsAfter] = await Promise.all([
      prisma.assessmentResult.findMany({ where: { residentId }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, type: true, score: true } }),
      prisma.residentIncident.findMany({ where: { residentId }, orderBy: { occurredAt: 'desc' }, take: 10, select: { id: true, type: true, severity: true } }),
    ]);

    return NextResponse.json({
      success: true,
      createdAssessments: result.createdAssessments,
      createdIncidents: result.createdIncidents,
      snapshot: { assessments: assessAfter, incidents: incidentsAfter },
    }, { status: 201, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error('dev seed-resident-assessments-incidents error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
