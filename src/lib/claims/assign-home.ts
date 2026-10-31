import { prisma } from '@/lib/prisma';
import { recordEvent, type EventActor } from '@/lib/events/record-event';
import { sendOperatorClaimNotification } from '@/lib/email';

/**
 * The admin ownership transfer, shared by POST /api/admin/homes/[id]/claim and the self-serve claim
 * approval (fix/self-serve-claim). Reassigns the listing's operatorId and moves it to PENDING_REVIEW so the
 * operator can fill in real details before it goes live. Behavior is unchanged from the admin route.
 */
export type AssignableOperator = {
  id: string;
  userId: string;
  user: { email: string | null; firstName: string | null; lastName: string | null } | null;
};

export async function assignHomeToOperator(args: {
  home: { id: string; name: string; operatorId: string; status: string };
  operator: AssignableOperator;
  actor: EventActor;
}) {
  const { home, operator, actor } = args;
  // Idempotency guard for the claim notification: only notify when the home is actually transitioning INTO
  // PENDING_REVIEW. Re-running on a home that's already PENDING_REVIEW must not double-send (OL-079).
  const wasAlreadyPendingReview = home.status === 'PENDING_REVIEW';

  const updatedHome = await prisma.$transaction(async (tx) => {
    // History: admin reassigned the listing (sprint W5-1).
    await recordEvent(tx, {
      entityType: 'LISTING_CLAIM',
      entityId: home.id,
      eventType: 'claim.assigned',
      field: 'operatorId',
      oldValue: { operatorId: home.operatorId, status: home.status },
      newValue: { operatorId: operator.id, status: 'PENDING_REVIEW' },
      source: 'ADMIN',
      actor,
    });
    return tx.assistedLivingHome.update({
      where: { id: home.id },
      data: { operatorId: operator.id, status: 'PENDING_REVIEW' },
      include: { operator: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } },
    });
  });

  // Notify the operator that the listing is now theirs
  await prisma.notification.create({
    data: {
      userId: operator.userId,
      type: 'SYSTEM',
      title: 'Listing assigned to you',
      message: `The listing "${home.name}" has been assigned to your account. Add your photos, pricing, and availability, then it will be reviewed and published.`,
      link: `/operator/homes/${home.id}`,
    },
  });

  // Surface the claim to the founder/admin in real time (non-blocking, OL-079).
  if (!wasAlreadyPendingReview) {
    void sendOperatorClaimNotification({
      facilityName: home.name,
      operatorEmail: operator.user?.email ?? 'unknown',
      operatorName: [operator.user?.firstName, operator.user?.lastName].filter(Boolean).join(' ') || undefined,
      homeId: home.id,
      status: 'PENDING_REVIEW',
    }).catch((e) => console.error('[admin claim] founder notification failed', e));
  }

  return { updatedHome, previousOperatorId: home.operatorId };
}

/**
 * Self-serve claim approval (fix/self-serve-claim): transfer ownership ONLY. The listing's status is left as
 * it is, so an ACTIVE (published) listing stays in public search. Records the approval in the listing
 * history and tells the operator in-app. The admin route above keeps its PENDING_REVIEW behavior, and the
 * signed outreach claim path (/claim → /api/operator/homes/[id]/claim) is untouched.
 */
export async function transferHomeOwnership(args: {
  home: { id: string; name: string; operatorId: string; status: string };
  operator: AssignableOperator;
  actor: EventActor;
  claimId: string;
}) {
  const { home, operator, actor } = args;
  const updatedHome = await prisma.$transaction(async (tx) => {
    await recordEvent(tx, {
      entityType: 'LISTING_CLAIM',
      entityId: home.id,
      eventType: 'claim.approved',
      field: 'operatorId',
      oldValue: { operatorId: home.operatorId, status: home.status },
      newValue: { operatorId: operator.id, status: home.status, source: 'self_serve' },
      source: 'ADMIN',
      actor,
    });
    return tx.assistedLivingHome.update({ where: { id: home.id }, data: { operatorId: operator.id }, select: { id: true, status: true, operatorId: true } });
  });
  await prisma.notification.create({
    data: {
      userId: operator.userId,
      type: 'SYSTEM',
      title: 'Your listing claim is approved',
      message: `"${home.name}" is now yours. Add your photos, pricing, and availability to keep it current.`,
      link: `/operator/homes/${home.id}`,
    },
  });
  return { updatedHome, previousOperatorId: home.operatorId };
}
