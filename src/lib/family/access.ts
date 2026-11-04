/**
 * P0-3 (security decision package, Nov 2026): family access is granted only to an ACTIVE FamilyMember or to the
 * family's own owner account. Before this, GET /api/family/notes and GET /api/family/emergency auto-created an
 * ACTIVE membership for ANY signed-in user and ANY familyId they passed, which unlocked every family document,
 * download, resident summary, contact and timeline route.
 *
 * The one legitimate self-heal is kept: the account that owns the Family row (Family.userId) gets its missing
 * OWNER membership created. Nobody else is ever added here — invitations go through /api/family/members/invite.
 */
import { prisma } from '@/lib/prisma';

export type FamilyAccess =
  | { ok: true; role: 'OWNER' | 'CARE_PROXY' | 'MEMBER' | 'GUEST' }
  | { ok: false; status: 403 | 404; error: string };

export async function ensureFamilyAccess(
  userId: string,
  familyId: string,
  opts: { write?: boolean } = {},
): Promise<FamilyAccess> {
  const member = await prisma.familyMember.findFirst({
    where: { familyId, userId, status: 'ACTIVE' },
    select: { role: true },
  });
  if (member) {
    if (opts.write && member.role === 'GUEST') return { ok: false, status: 403, error: 'Guests cannot make changes' };
    return { ok: true, role: member.role };
  }

  const family = await prisma.family.findUnique({ where: { id: familyId }, select: { userId: true } });
  if (!family) return { ok: false, status: 404, error: 'Family not found' };
  if (family.userId !== userId) return { ok: false, status: 403, error: 'Forbidden' };

  // The family's own owner account: restore its OWNER membership (never anyone else's).
  try {
    await prisma.familyMember.create({ data: { familyId, userId, role: 'OWNER', status: 'ACTIVE', joinedAt: new Date() } });
  } catch {
    /* a concurrent request created it; access is still the owner's */
  }
  return { ok: true, role: 'OWNER' };
}
