export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, ComplianceStatus, ResidentStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  // Allow when explicitly enabled via ALLOW_DEV_ENDPOINTS, regardless of NODE_ENV
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  const prisma = new PrismaClient();
  try {
    const body = await request.json().catch(() => ({} as any));
    const familyId: string = body.familyId;
    if (!familyId) {
      return NextResponse.json({ success: false, message: 'familyId required' }, { status: 400 });
    }

    const firstName: string = body.firstName || 'Test';
    const lastName: string = body.lastName || 'Resident';
    const dob: string | undefined = body.dateOfBirth;

    const resident = await prisma.resident.create({
      data: {
        familyId,
        firstName,
        lastName,
        dateOfBirth: dob ? new Date(dob) : new Date('1945-06-15'),
        gender: 'OTHER',
        status: ResidentStatus.ACTIVE,
        admissionDate: new Date(),
      },
      select: { id: true }
    });

    const contacts = (body.contacts as any[]) ?? [
      { name: 'Primary Contact', relationship: 'Daughter', email: 'primary@example.com', phone: '555-111-2222', isPrimary: true },
      { name: 'Backup Contact', relationship: 'Son', email: 'backup@example.com', phone: '555-333-4444', isPrimary: false },
    ];
    if (contacts?.length) {
      await prisma.residentContact.createMany({
        data: contacts.map(c => ({ ...c, residentId: resident.id })),
      });
    }

    // Create compliance items from body or defaults
    const now = new Date();
    const compliance = (body.compliance as any[]) ?? [
      { type: 'FLU_SHOT', title: 'Flu Shot', status: 'COMPLETED', completedAt: now },
      { type: 'TB_TEST', title: 'TB Test', status: 'OPEN', dueDate: new Date(now.getTime() + 7*24*60*60*1000) },
      { type: 'CARE_PLAN', title: 'Care Plan Review', status: 'OPEN', dueDate: new Date(now.getTime() - 3*24*60*60*1000) },
    ];
    if (compliance?.length) {
      await prisma.residentComplianceItem.createMany({
        data: compliance.map((i) => ({
          residentId: resident.id,
          type: i.type,
          title: i.title,
          notes: i.notes ?? null,
          owner: i.owner ?? null,
          status: (i.status === 'COMPLETED' ? ComplianceStatus.COMPLETED : ComplianceStatus.OPEN),
          severity: i.severity ?? null,
          dueDate: i.dueDate ? new Date(i.dueDate) : null,
          completedAt: i.completedAt ? new Date(i.completedAt) : (i.status === 'COMPLETED' ? now : null),
        })),
      });
    }

    return NextResponse.json({ success: true, residentId: resident.id });
  } catch (e) {
    console.error('seed-family-resident failed', e);
    return NextResponse.json({ success: false, message: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
