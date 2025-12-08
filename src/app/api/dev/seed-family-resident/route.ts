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
      { type: 'IMMUNIZATION_RECORDS', title: 'Flu Shot', status: 'CURRENT', issuedDate: now, expiryDate: new Date(now.getTime() + 365*24*60*60*1000) },
      { type: 'HEALTH_ASSESSMENTS', title: 'TB Test', status: 'EXPIRING_SOON', issuedDate: new Date(now.getTime() - 350*24*60*60*1000), expiryDate: new Date(now.getTime() + 15*24*60*60*1000) },
      { type: 'CARE_PLANS', title: 'Care Plan Review', status: 'CURRENT', issuedDate: new Date(now.getTime() - 60*24*60*60*1000), expiryDate: new Date(now.getTime() + 30*24*60*60*1000) },
    ];
    if (compliance?.length) {
      await prisma.residentComplianceItem.createMany({
        data: compliance.map((i) => ({
          residentId: resident.id,
          type: i.type,
          title: i.title,
          notes: i.notes ?? null,
          status: (i.status ?? 'CURRENT') as any,
          issuedDate: i.issuedDate ? new Date(i.issuedDate) : null,
          expiryDate: i.expiryDate ? new Date(i.expiryDate) : null,
          documentUrl: i.documentUrl ?? null,
          verifiedBy: i.verifiedBy ?? null,
          verifiedAt: i.verifiedAt ? new Date(i.verifiedAt) : null,
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
