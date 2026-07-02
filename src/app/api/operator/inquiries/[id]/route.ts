import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, InquiryStatus } from '@prisma/client';
import { z } from 'zod';
import { captureError } from '@/lib/sentry';
import { maybeSendQuoteSurvey } from '@/lib/pricing/quote-survey';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: {
        home: { select: { id: true, name: true, operatorId: true } },
        family: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
      },
    });
    if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const data = {
      id: inquiry.id,
      status: inquiry.status,
      createdAt: inquiry.createdAt.toISOString(),
      tourDate: inquiry.tourDate ? inquiry.tourDate.toISOString() : null,
      message: inquiry.message || null,
      internalNotes: inquiry.internalNotes || '',
      home: { id: inquiry.home.id, name: inquiry.home.name },
      // On-row lead contact — source of truth for anonymous (unlinked) inquiries.
      contact: {
        name: inquiry.contactName || null,
        email: inquiry.contactEmail || null,
        phone: inquiry.contactPhone || null,
        careRecipientName: inquiry.careRecipientName || null,
      },
      // Null for anonymous inquiries that aren't linked to a family account yet.
      family: inquiry.family
        ? {
            id: inquiry.family.id,
            name: [inquiry.family.user?.firstName, inquiry.family.user?.lastName].filter(Boolean).join(' '),
            email: inquiry.family.user?.email || null,
            phone: inquiry.family.user?.phone || null,
            user: inquiry.family.user || null,
          }
        : null,
    };

    return NextResponse.json({ inquiry: data });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:inquiries:{id}' },
    });
    console.error('Get inquiry failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

const PatchSchema = z.object({
  status: z.nativeEnum(InquiryStatus).optional(),
  tourDate: z.string().datetime().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: { home: { select: { operatorId: true } } },
    });
    if (!inquiry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const json = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const data: any = {};
    if (parsed.data.status) data.status = parsed.data.status;
    if ('tourDate' in parsed.data) {
      data.tourDate = parsed.data.tourDate ? new Date(parsed.data.tourDate) : null;
    }

    const updated = await prisma.inquiry.update({ where: { id: inquiry.id }, data });

    // Post-tour family quote survey (OL-111) — fire-and-forget, flag-gated OFF by
    // default, PHI-safe. Only when this transition marks the tour complete.
    if (parsed.data.status === 'TOUR_COMPLETED') {
      void maybeSendQuoteSurvey(inquiry.id);
    }

    return NextResponse.json({ inquiry: updated });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), {
      tags: { route: 'operator:inquiries:{id}' },
    });
    console.error('Update inquiry failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
