import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createAuditLogFromRequest } from '@/lib/audit';
import * as Sentry from '@sentry/nextjs';

// Assumptions:
// - Operator/Admin can read/update resident contacts they have access to via home/operator scope.
// - PUT replaces the entire contact list (idempotent upsert by (residentId,email)).
// - Emails are optional; uniqueness constraint allows null duplicates; we handle nulls per record keying by cuid.

const ContactSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  relationship: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
  preferences: z.any().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, home: { select: { operatorId: true } } },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Scope guard for operators: ensure same operator
    if (session!.user!.role === 'OPERATOR') {
      const me = await prisma.user.findUnique({ where: { email: session!.user!.email! }, select: { id: true } });
      const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
      if (!op || resident.home?.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const contacts = await prisma.residentContact.findMany({ where: { residentId: params.id }, orderBy: { createdAt: 'asc' } });
    return NextResponse.json({ items: contacts });
  } catch (e) {
    console.error('contacts GET error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: { id: true, home: { select: { operatorId: true } } },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (session!.user!.role === 'OPERATOR') {
      const me = await prisma.user.findUnique({ where: { email: session!.user!.email! }, select: { id: true } });
      const op = me ? await prisma.operator.findUnique({ where: { userId: me.id }, select: { id: true } }) : null;
      if (!op || resident.home?.operatorId !== op.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const items = z.array(ContactSchema).parse(body?.items ?? []);

    // Replace strategy: delete existing, then create many (transaction)
    await prisma.$transaction([
      prisma.residentContact.deleteMany({ where: { residentId: resident.id } }),
      prisma.residentContact.createMany({
        data: items.map((c) => ({
          residentId: resident.id,
          name: c.name,
          relationship: c.relationship || null,
          email: c.email || null,
          phone: c.phone || null,
          isPrimary: !!c.isPrimary,
          preferences: c.preferences ?? undefined,
        })),
      }),
    ]);

    Sentry.addBreadcrumb({ category: 'resident', message: 'contacts_updated', level: 'info', data: { residentId: resident.id, count: items.length } });
    await createAuditLogFromRequest(req, 'UPDATE', 'ResidentContact', resident.id, 'Updated resident contacts');
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('contacts PUT error', e);
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
