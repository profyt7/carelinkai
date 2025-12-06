export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAnyRole } from '@/lib/rbac';
import { z } from 'zod';

type Params = { params: { id: string } };

const updateCredentialSchema = z.object({
  status: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED']).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await requireAnyRole(['ADMIN' as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  if (!id) return NextResponse.json({ error: 'Missing credential id' }, { status: 400 });

  const body = await req.json();
  const validationResult = updateCredentialSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: validationResult.error.format() },
      { status: 400 }
    );
  }

  const { status, notes } = validationResult.data;

  const credential = await prisma.providerCredential.findUnique({ where: { id } });
  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
  }

  const updates: any = {};
  if (status !== undefined) {
    updates.status = status;
    // If verifying, set verifiedAt and verifiedBy
    if (status === 'VERIFIED') {
      updates.verifiedAt = new Date();
      updates.verifiedBy = session.user.id;
    }
  }
  if (notes !== undefined) updates.notes = notes;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const updatedCredential = await prisma.providerCredential.update({
    where: { id },
    data: updates,
  });

  return NextResponse.json({
    success: true,
    credential: updatedCredential,
  });
}
