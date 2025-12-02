import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole } from '@prisma/client';
import { z } from 'zod';
import emailService from '@/lib/email/sendgrid';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

const RespondSchema = z.object({
  message: z.string().min(1).max(5000),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const inquiry = await prisma.inquiry.findUnique({
      where: { id: params.id },
      include: {
        home: { select: { operatorId: true, name: true } },
        family: { select: { user: { select: { email: true, firstName: true } } } },
      },
    });
    if (!inquiry) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (user.role !== UserRole.ADMIN) {
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator || inquiry.home.operatorId !== operator.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const json = await req.json().catch(() => ({}));
    const parsed = RespondSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.format() }, { status: 400 });
    }

    const now = new Date();
    const updated = await prisma.inquiry.update({
      where: { id: inquiry.id },
      data: { operatorResponse: parsed.data.message, operatorResponseAt: now },
      select: { id: true, operatorResponse: true, operatorResponseAt: true },
    });

    // Optional: email notification to family
    if (inquiry.family.user.email) {
      await emailService.sendNotificationEmail(
        inquiry.family.user.email,
        `New response from ${inquiry.home.name}`,
        {
          firstName: inquiry.family.user.firstName || 'there',
          message: parsed.data.message,
          actionUrl: undefined,
          actionText: undefined,
          category: 'lead-response',
        }
      ).catch(() => void 0);
    }

    return NextResponse.json({ id: updated.id, operatorResponse: updated.operatorResponse, operatorResponseAt: updated.operatorResponseAt });
  } catch (e) {
    console.error('Operator respond failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
