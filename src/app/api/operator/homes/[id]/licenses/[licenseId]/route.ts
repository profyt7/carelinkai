
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

﻿import { NextRequest, NextResponse } from 'next/server';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { PrismaClient, UserRole } from '@prisma/client';
import { deleteObject as s3Delete, parseS3Url } from '@/lib/storage';

const prisma = new PrismaClient();

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; licenseId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { operatorId: true } });
      if (!op || !home || op.id !== home.operatorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const lic = await prisma.license.findUnique({ where: { id: params.licenseId } });
    if (!lic || lic.homeId !== params.id) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (lic.documentUrl) {
      const s3 = parseS3Url(lic.documentUrl);
      if (s3) await s3Delete({ bucket: s3.bucket, key: s3.key });
    }
    await prisma.license.delete({ where: { id: params.licenseId } });
    return NextResponse.json({ success: true });
  } finally {
    await prisma.$disconnect();
  }
}

// Support HTML form POST for delete with redirect back to UI
export async function POST(req: NextRequest, { params }: { params: { id: string; licenseId: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return NextResponse.redirect('/operator/compliance', 303);
    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user) return NextResponse.redirect('/operator/compliance', 303);
    if (user.role !== UserRole.ADMIN) {
      const op = await prisma.operator.findUnique({ where: { userId: user.id } });
      const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { operatorId: true } });
      if (!op || !home || op.id !== home.operatorId) return NextResponse.redirect('/operator/compliance', 303);
    }

    const lic = await prisma.license.findUnique({ where: { id: params.licenseId } });
    if (lic && lic.homeId === params.id) {
      if (lic.documentUrl) {
        const s3 = parseS3Url(lic.documentUrl);
        if (s3) await s3Delete({ bucket: s3.bucket, key: s3.key });
      }
      await prisma.license.delete({ where: { id: params.licenseId } });
    }
    return NextResponse.redirect('/operator/compliance', 303);
  } finally {
    await prisma.$disconnect();
  }
}