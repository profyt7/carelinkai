import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { createAuditLogFromRequest } from '@/lib/audit';
import { approveHomeClaim, rejectHomeClaim } from '@/lib/claims/self-serve';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ action: z.enum(['approve', 'reject']) });
const STATUS: Record<string, number> = { not_found: 404, not_pending: 409, already_claimed: 409 };

/** PATCH /api/admin/home-claims/[id] { action: 'approve' | 'reject' }. Approve runs the existing ownership transfer. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const adminId = session?.user?.id;
  if (!adminId || session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });

  const { id } = await params;
  const result = parsed.data.action === 'approve' ? await approveHomeClaim(id, { userId: adminId }) : await rejectHomeClaim(id, { userId: adminId });
  if (!result.ok) return NextResponse.json({ error: result.reason, reason: result.reason }, { status: STATUS[result.reason] ?? 400 });

  await createAuditLogFromRequest(req, AuditAction.UPDATE, 'HomeClaim', id, `Admin ${result.status === 'APPROVED' ? 'approved' : 'rejected'} self-serve claim ${id}`, { adminAction: true, status: result.status });
  return NextResponse.json({ ok: true, status: result.status });
}
