import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole, ResidentStatus } from '@prisma/client';
import { requireOperatorOrAdmin } from '@/lib/rbac';

const prisma = new PrismaClient();

async function ensureAccess(userEmail: string, residentId: string) {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return { status: 401 as const };
  if (user.role === UserRole.ADMIN) return { status: 200 as const };
  if (user.role === UserRole.OPERATOR) {
    const op = await prisma.operator.findUnique({ where: { userId: user.id } });
    if (!op) return { status: 403 as const };
    const res = await prisma.resident.findUnique({ where: { id: residentId }, select: { home: { select: { operatorId: true } } } });
    if (!res) return { status: 404 as const };
    if (res.home && res.home.operatorId !== op.id) return { status: 403 as const };
    return { status: 200 as const };
  }
  return { status: 403 as const };
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('Resident API GET start', params.id);
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const access = await ensureAccess(session!.user!.email!, params.id);
    if (access.status !== 200) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });

    const resident = await prisma.resident.findUnique({
      where: { id: params.id },
      select: {
        id: true, firstName: true, lastName: true, status: true, dateOfBirth: true, gender: true, homeId: true,
        createdAt: true, updatedAt: true, archivedAt: true,
        medicalConditions: true, medications: true, allergies: true, dietaryRestrictions: true,
      },
    });
    if (!resident) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    console.log('Resident API GET ok', params.id);
    return NextResponse.json({ resident });
  } catch (e) {
    console.error('Resident get error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const access = await ensureAccess(session!.user!.email!, params.id);
    if (access.status !== 200) return NextResponse.json({ error: 'Forbidden' }, { status: access.status });

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    for (const k of ['firstName', 'lastName', 'gender', 'homeId'] as const) if (body[k] !== undefined) data[k] = body[k];
    if (body.status) data.status = body.status as ResidentStatus;
    if (body.dateOfBirth) data.dateOfBirth = new Date(body.dateOfBirth);
    
    // Medical information fields (encrypted at rest)
    if (body.medicalConditions !== undefined) {
      data.medicalConditions = body.medicalConditions ? String(body.medicalConditions).slice(0, 2000) : null;
    }
    if (body.medications !== undefined) {
      data.medications = body.medications ? String(body.medications).slice(0, 2000) : null;
    }
    if (body.allergies !== undefined) {
      data.allergies = body.allergies ? String(body.allergies).slice(0, 1000) : null;
    }
    if (body.dietaryRestrictions !== undefined) {
      data.dietaryRestrictions = body.dietaryRestrictions ? String(body.dietaryRestrictions).slice(0, 1000) : null;
    }

    const updated = await prisma.resident.update({ where: { id: params.id }, data, select: { id: true } });
    return NextResponse.json({ success: true, id: updated.id });
  } catch (e) {
    console.error('Resident update error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
