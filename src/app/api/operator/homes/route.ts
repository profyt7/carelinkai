import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireOperatorOrAdmin, requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const { session, error } = await requireOperatorOrAdmin();
  if (error) return error;

  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let where: any = {};
  if (user.role === UserRole.OPERATOR) {
    const op = await prisma.operator.findUnique({ where: { userId: user.id } });
    if (!op) return NextResponse.json({ error: 'Operator profile missing' }, { status: 400 });
    where = { operatorId: op.id };
  }

  const homes = await prisma.assistedLivingHome.findMany({ where, include: { address: true }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ homes });
}

export async function POST(req: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["OPERATOR" as any]);
    if (error) return error;

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || user.role !== UserRole.OPERATOR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
    if (!operator) return NextResponse.json({ error: 'Operator profile missing' }, { status: 400 });

    const body = await req.json();
    const { name, description, careLevel, capacity, priceMin, priceMax, address } = body || {};
    if (!name || !description || !Array.isArray(careLevel) || !capacity || !address?.city || !address?.state || !address?.street || !address?.zipCode) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const home = await prisma.assistedLivingHome.create({
      data: {
        operatorId: operator.id,
        name,
        description,
        status: 'ACTIVE',
        careLevel,
        capacity: Number(capacity),
        currentOccupancy: 0,
        priceMin: priceMin ? Number(priceMin) : null,
        priceMax: priceMax ? Number(priceMax) : null,
        amenities: [],
        address: {
          create: {
            street: address.street,
            street2: address.street2 || null,
            city: address.city,
            state: address.state,
            zipCode: address.zipCode,
          },
        },
      },
    });
    return NextResponse.json({ home }, { status: 201 });
  } catch (e) {
    console.error('Create home failed', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
