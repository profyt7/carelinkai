export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isAcceptanceCurrent, BAA_CURRENT_VERSION, DPA_CURRENT_VERSION } from '@/lib/legal';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

const ROLES_REQUIRING_ACCEPTANCE = ['OPERATOR', 'CAREGIVER', 'DISCHARGE_PLANNER', 'PROVIDER'] as const;
type AcceptanceRole = typeof ROLES_REQUIRING_ACCEPTANCE[number];

/** GET — check whether the current user's BAA/DPA acceptance is current */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ROLES_REQUIRING_ACCEPTANCE.includes(session.user.role as AcceptanceRole)) {
      return NextResponse.json({ current: true, bypass: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const current = await isAcceptanceCurrent(session.user.id);
    return NextResponse.json({ current }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('acceptance GET error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST — record BAA + DPA acceptance for the current user's PHI-accessing role */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!ROLES_REQUIRING_ACCEPTANCE.includes(session.user.role as AcceptanceRole)) {
      return NextResponse.json({ error: 'This account type does not sign legal agreements' }, { status: 400 });
    }

    const body = await req.json();
    const { acceptedBaa, acceptedDpa } = body;

    if (!acceptedBaa || !acceptedDpa) {
      return NextResponse.json({ error: 'Both BAA and DPA must be accepted' }, { status: 400 });
    }

    const userId = session.user.id;
    const role = session.user.role as AcceptanceRole;
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';
    const now = new Date();

    const acceptanceData = {
      baaTemplateVersion: BAA_CURRENT_VERSION,
      baaAcceptedAt: now,
      baaAcceptedIp: ip,
      baaAcceptedUserAgent: ua,
      dpaTemplateVersion: DPA_CURRENT_VERSION,
      dpaAcceptedAt: now,
      dpaAcceptedIp: ip,
      dpaAcceptedUserAgent: ua,
    };

    let profileId: string;

    switch (role) {
      case 'OPERATOR': {
        const record = await prisma.operator.findUnique({ where: { userId }, select: { id: true } });
        if (!record) return NextResponse.json({ error: 'Operator record not found' }, { status: 404 });
        await prisma.operator.update({ where: { id: record.id }, data: acceptanceData });
        profileId = record.id;
        break;
      }
      case 'CAREGIVER': {
        const record = await prisma.caregiver.findUnique({ where: { userId }, select: { id: true } });
        if (!record) return NextResponse.json({ error: 'Caregiver record not found' }, { status: 404 });
        await prisma.caregiver.update({ where: { id: record.id }, data: acceptanceData });
        profileId = record.id;
        break;
      }
      case 'DISCHARGE_PLANNER': {
        const record = await prisma.dischargePlannerProfile.findUnique({ where: { userId }, select: { id: true } });
        if (!record) return NextResponse.json({ error: 'Discharge planner profile not found' }, { status: 404 });
        await prisma.dischargePlannerProfile.update({ where: { id: record.id }, data: acceptanceData });
        profileId = record.id;
        break;
      }
      case 'PROVIDER': {
        const record = await prisma.provider.findUnique({ where: { userId }, select: { id: true } });
        if (!record) return NextResponse.json({ error: 'Provider record not found' }, { status: 404 });
        await prisma.provider.update({ where: { id: record.id }, data: acceptanceData });
        profileId = record.id;
        break;
      }
    }

    await Promise.all([
      createAuditLogFromRequest(req, AuditAction.LEGAL_ACCEPTANCE, 'BAA', profileId!, 'BAA accepted', {
        role,
        version: BAA_CURRENT_VERSION,
      }),
      createAuditLogFromRequest(req, AuditAction.LEGAL_ACCEPTANCE, 'DPA', profileId!, 'DPA accepted', {
        role,
        version: DPA_CURRENT_VERSION,
      }),
    ]);

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('acceptance POST error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
