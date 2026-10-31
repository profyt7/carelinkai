import type { HomeClaimStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import { captureError } from '@/lib/sentry';
import { sendHomeClaimAdminNotice, sendHomeClaimDecisionEmail } from '@/lib/email';
import { isUnclaimedHome } from '@/lib/claim-engine/inquiry-claim-notification';
import { transferHomeOwnership } from '@/lib/claims/assign-home';

/**
 * Self-serve listing claim (fix/self-serve-claim). An operator asks for an unclaimed listing → a
 * PENDING_REVIEW HomeClaim + an admin email and queue entry. Nothing changes hands until an admin approves;
 * approval transfers ownership only (transferHomeOwnership: status unchanged, so a published listing stays
 * public), rejection emails the operator.
 * One pending claim per home (checked here and enforced by a partial unique index). Claimed homes are refused.
 */

export type ClaimSource = 'listing_button' | 'signup';

export type SubmitClaimResult =
  | { ok: true; claimId: string }
  | { ok: false; reason: 'not_operator' | 'home_not_found' | 'already_claimed' | 'pending_exists' };

const homeSelect = { id: true, name: true, operatorId: true, status: true, operator: { select: { user: { select: { email: true } } } } } as const;

export async function submitSelfServeClaim(args: { homeId: string; userId: string; source: ClaimSource }): Promise<SubmitClaimResult> {
  const operator = await prisma.operator.findUnique({ where: { userId: args.userId }, select: { id: true, user: { select: { email: true, role: true } } } });
  if (!operator || operator.user?.role !== 'OPERATOR') return { ok: false, reason: 'not_operator' };

  const home = await prisma.assistedLivingHome.findUnique({ where: { id: args.homeId }, select: homeSelect });
  if (!home) return { ok: false, reason: 'home_not_found' };
  if (!isUnclaimedHome(home.operator?.user?.email)) return { ok: false, reason: 'already_claimed' };

  const pending = await prisma.homeClaim.findFirst({ where: { homeId: home.id, status: 'PENDING_REVIEW' }, select: { id: true } });
  if (pending) return { ok: false, reason: 'pending_exists' };

  let claimId: string;
  try {
    claimId = await prisma.$transaction(async (tx) => {
      const claim = await tx.homeClaim.create({ data: { homeId: home.id, operatorId: operator.id, source: args.source }, select: { id: true } });
      await recordEvent(tx, {
        entityType: 'LISTING_CLAIM', entityId: home.id, eventType: 'claim.requested', field: 'status',
        oldValue: null, newValue: { status: 'PENDING_REVIEW', operatorId: operator.id, source: args.source },
        source: 'OPERATOR', actor: { userId: args.userId, role: 'OPERATOR' },
      });
      return claim.id;
    });
  } catch (e) {
    // Lost a race with another claimant: the partial unique index allows one pending claim per home.
    if ((e as { code?: string })?.code === 'P2002') return { ok: false, reason: 'pending_exists' };
    throw e;
  }

  void sendHomeClaimAdminNotice({ homeName: home.name, operatorEmail: operator.user?.email ?? 'unknown', claimId }).catch((e) =>
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'home-claim' }, extra: { claimId } }),
  );
  void notifyAdminsInApp(home.name, operator.user?.email ?? 'unknown').catch(() => undefined);
  return { ok: true, claimId };
}

async function notifyAdminsInApp(homeName: string, operatorEmail: string): Promise<void> {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true }, take: 20 });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, type: 'SYSTEM' as const, title: `New claim: ${homeName} by ${operatorEmail}`, message: 'Verify the operator, then approve or reject.', link: '/admin/home-claims' })),
  });
}

export type ReviewResult =
  | { ok: true; status: HomeClaimStatus }
  | { ok: false; reason: 'not_found' | 'not_pending' | 'already_claimed' };

const claimInclude = {
  home: { select: homeSelect },
  operator: { select: { id: true, userId: true, user: { select: { email: true, firstName: true, lastName: true } } } },
} as const;

/** Approve: transfer ownership only (the listing's public status is unchanged), record it, email the operator. */
export async function approveHomeClaim(claimId: string, admin: { userId: string }): Promise<ReviewResult> {
  const claim = await prisma.homeClaim.findUnique({ where: { id: claimId }, include: claimInclude });
  if (!claim) return { ok: false, reason: 'not_found' };
  if (claim.status !== 'PENDING_REVIEW') return { ok: false, reason: 'not_pending' };
  // Someone else got the listing meanwhile (e.g. an outreach link or an admin assignment): don't move it again.
  if (!isUnclaimedHome(claim.home.operator?.user?.email)) return { ok: false, reason: 'already_claimed' };

  // Close the claim first (conditional, so a double click can't transfer twice), then transfer.
  const closed = await prisma.homeClaim.updateMany({ where: { id: claim.id, status: 'PENDING_REVIEW' }, data: { status: 'APPROVED', reviewedAt: new Date(), reviewedById: admin.userId } });
  if (closed.count === 0) return { ok: false, reason: 'not_pending' };
  // Ownership only: the listing keeps its status, so a published listing stays public.
  await transferHomeOwnership({ home: claim.home, operator: claim.operator, actor: { userId: admin.userId, role: 'ADMIN' }, claimId: claim.id });

  if (claim.operator.user?.email) {
    void sendHomeClaimDecisionEmail({ to: claim.operator.user.email, firstName: claim.operator.user.firstName, homeName: claim.home.name, decision: 'approved', homeId: claim.home.id }).catch(() => undefined);
  }
  return { ok: true, status: 'APPROVED' };
}

/** Reject: nothing changes hands; the operator gets a polite email. */
export async function rejectHomeClaim(claimId: string, admin: { userId: string }): Promise<ReviewResult> {
  const claim = await prisma.homeClaim.findUnique({ where: { id: claimId }, include: claimInclude });
  if (!claim) return { ok: false, reason: 'not_found' };
  const closed = await prisma.homeClaim.updateMany({ where: { id: claim.id, status: 'PENDING_REVIEW' }, data: { status: 'REJECTED', reviewedAt: new Date(), reviewedById: admin.userId } });
  if (closed.count === 0) return { ok: false, reason: 'not_pending' };
  await recordEvent(prisma, {
    entityType: 'LISTING_CLAIM', entityId: claim.home.id, eventType: 'claim.rejected', field: 'status',
    oldValue: { status: 'PENDING_REVIEW' }, newValue: { status: 'REJECTED', operatorId: claim.operator.id },
    source: 'ADMIN', actor: { userId: admin.userId, role: 'ADMIN' },
  });
  if (claim.operator.user?.email) {
    void sendHomeClaimDecisionEmail({ to: claim.operator.user.email, firstName: claim.operator.user.firstName, homeName: claim.home.name, decision: 'rejected', homeId: claim.home.id }).catch(() => undefined);
  }
  return { ok: true, status: 'REJECTED' };
}

/** What the listing page shows: open to claim, a claim under review, or managed by its community. */
export type ListingClaimState = 'open' | 'pending' | 'claimed';

export async function listingClaimState(home: { id: string; operatorEmail: string | null | undefined }): Promise<ListingClaimState> {
  if (!isUnclaimedHome(home.operatorEmail)) return 'claimed';
  const pending = await prisma.homeClaim.count({ where: { homeId: home.id, status: 'PENDING_REVIEW' } });
  return pending > 0 ? 'pending' : 'open';
}
