import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { prisma } from './prisma';

export { SubscriptionPlan, SubscriptionStatus };

/**
 * Features that require a specific minimum plan tier.
 * Unlocked = available on any plan (including no plan / trial).
 */
export const FEATURES = {
  // Available to all operators (including free trial and no-plan)
  INQUIRY_PIPELINE:       'STARTER',
  RESIDENT_MANAGEMENT:    'STARTER',
  BASIC_CAREGIVER:        'STARTER',

  // Professional and above
  AI_INQUIRY_RESPONSE:    'PROFESSIONAL',
  CAREGIVER_MANAGEMENT:   'PROFESSIONAL',
  TOUR_SCHEDULING:        'PROFESSIONAL',
  ANALYTICS:              'PROFESSIONAL',
  ON_CALL_AI:             'PROFESSIONAL',
  SHIFT_AUTOFILL:         'PROFESSIONAL',

  // Growth and above
  DISCHARGE_PLANNER:      'GROWTH',
  ADVANCED_ANALYTICS:     'GROWTH',
  PRIORITY_SUPPORT:       'GROWTH',

  // Agency and above (multi-location staffing agencies)
  AGENCY_MANAGEMENT:      'AGENCY',
  BULK_HIRING:            'AGENCY',
  CONTRACTOR_MANAGEMENT:  'AGENCY',

  // Enterprise only
  WHITE_LABEL:            'ENTERPRISE',
  API_ACCESS:             'ENTERPRISE',
} as const;

const PLAN_RANK: Record<string, number> = {
  STARTER:      1,
  PROFESSIONAL: 2,
  GROWTH:       3,
  AGENCY:       3, // Agency is a peer of Growth, specialized for staffing agencies
  ENTERPRISE:   4,
};

/** True if the operator's current plan meets or exceeds the required plan. */
export function planHasFeature(
  operatorPlan: SubscriptionPlan | null | undefined,
  requiredPlan: string
): boolean {
  if (!operatorPlan) return false;
  return (PLAN_RANK[operatorPlan] ?? 0) >= (PLAN_RANK[requiredPlan] ?? 99);
}

/** True if the subscription is currently active (paid or trialing). */
export function isSubscriptionActive(
  status: SubscriptionStatus | null | undefined
): boolean {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;
}

/**
 * Fetches the operator record for a given userId and returns whether the
 * operator can use a specific feature. Throws if the operator is not found.
 */
export async function operatorCanUseFeature(
  userId: string,
  feature: keyof typeof FEATURES
): Promise<boolean> {
  const operator = await prisma.operator.findUnique({
    where: { userId },
    select: { subscriptionPlan: true, subscriptionStatus: true },
  });

  if (!operator) return false;
  if (!isSubscriptionActive(operator.subscriptionStatus)) return false;

  const requiredPlan = FEATURES[feature];
  return planHasFeature(operator.subscriptionPlan, requiredPlan);
}

/**
 * Returns the operator's subscription data for a given userId.
 * Returns null if no operator exists.
 */
export async function getOperatorSubscription(userId: string) {
  return prisma.operator.findUnique({
    where: { userId },
    select: {
      id: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      currentPeriodEndsAt: true,
    },
  });
}
