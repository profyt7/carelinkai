import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole } from "@prisma/client";
import { requireOperatorOrAdmin, requireAnyRole } from "@/lib/rbac";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const prisma = new PrismaClient();

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
    // Allow both OPERATOR and ADMIN roles to create homes
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;

    const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, careLevel, capacity, priceMin, priceMax, address, amenities, genderRestriction, operatorId: bodyOperatorId } = body || {};
    if (!name || !description || !Array.isArray(careLevel) || !capacity || !address?.city || !address?.state || !address?.street || !address?.zipCode) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Determine operatorId based on user role
    let operatorId: string;
    if (user.role === UserRole.ADMIN) {
      // Admin can specify operatorId in body, or we find/create a default
      if (bodyOperatorId) {
        operatorId = bodyOperatorId;
      } else {
        // Find the first operator or create admin as pseudo-operator
        const firstOperator = await prisma.operator.findFirst();
        if (firstOperator) {
          operatorId = firstOperator.id;
        } else {
          // Create an operator profile for admin if none exists
          const adminOperator = await prisma.operator.create({
            data: {
              userId: user.id,
              companyName: 'Admin Created Homes',
              businessType: 'LICENSED_OPERATOR',
              licenseNumber: 'ADMIN-' + Date.now(),
            }
          });
          operatorId = adminOperator.id;
        }
      }
    } else {
      // Regular OPERATOR - use their operator profile
      const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
      if (!operator) return NextResponse.json({ error: 'Operator profile missing' }, { status: 400 });
      operatorId = operator.id;
    }

    const home = await prisma.assistedLivingHome.create({
      data: {
        operatorId,
        name,
        description,
        status: 'ACTIVE',
        careLevel,
        capacity: Number(capacity),
        currentOccupancy: 0,
        priceMin: priceMin ? Number(priceMin) : null,
        priceMax: priceMax ? Number(priceMax) : null,
        amenities: Array.isArray(amenities) ? amenities : [],
        genderRestriction: genderRestriction || null,
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
  } finally {
    await prisma.$disconnect();
  }
}
