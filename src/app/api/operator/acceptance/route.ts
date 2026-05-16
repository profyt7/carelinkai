export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isOperatorAcceptanceCurrent, BAA_CURRENT_VERSION, DPA_CURRENT_VERSION } from '@/lib/legal';
import { createAuditLogFromRequest } from '@/lib/audit';
import { AuditAction } from '@prisma/client';

/** GET — check whether the current operator's acceptance is current */
export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // ADMIN accounts skip the gate
    if (session.user.role === 'ADMIN') {
      return NextResponse.json({ current: true, adminBypass: true }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!operator) {
      return NextResponse.json({ error: 'Operator record not found' }, { status: 404 });
    }

    const current = await isOperatorAcceptanceCurrent(operator.id);
    return NextResponse.json({ current }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('acceptance GET error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** POST — record BAA + DPA acceptance for the current operator */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Admin accounts do not sign operator agreements' }, { status: 400 });
    }

    const body = await req.json();
    const { acceptedBaa, acceptedDpa } = body;

    if (!acceptedBaa || !acceptedDpa) {
      return NextResponse.json(
        { error: 'Both BAA and DPA must be accepted' },
        { status: 400 }
      );
    }

    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!operator) {
      return NextResponse.json({ error: 'Operator record not found' }, { status: 404 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const ua = req.headers.get('user-agent') || 'unknown';
    const now = new Date();

    await prisma.operator.update({
      where: { id: operator.id },
      data: {
        baaTemplateVersion: BAA_CURRENT_VERSION,
        baaAcceptedAt: now,
        baaAcceptedIp: ip,
        baaAcceptedUserAgent: ua,
        dpaTemplateVersion: DPA_CURRENT_VERSION,
        dpaAcceptedAt: now,
        dpaAcceptedIp: ip,
        dpaAcceptedUserAgent: ua,
      },
    });

    // Audit both acceptance events
    await Promise.all([
      createAuditLogFromRequest(req, AuditAction.LEGAL_ACCEPTANCE, 'BAA', operator.id, 'BAA accepted', {
        version: BAA_CURRENT_VERSION,
      }),
      createAuditLogFromRequest(req, AuditAction.LEGAL_ACCEPTANCE, 'DPA', operator.id, 'DPA accepted', {
        version: DPA_CURRENT_VERSION,
      }),
    ]);

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('acceptance POST error', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
