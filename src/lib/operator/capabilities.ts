/**
 * Founder UX truth (OL-241): which operator tools a user can actually use, computed with the SAME checks
 * the server routes apply, so the UI never shows an entry point the server rejects.
 *
 *  - SHIFT_AUTOFILL: POST /api/operator/shifts/autofill requires an OPERATOR with planHasFeature(plan, 'PROFESSIONAL').
 *  - ONCALL: POST /api/scheduling/needs/[id]/start requires the same plan check, and the dispatcher only reaches
 *    caregivers by SMS (src/lib/oncall/dispatcher.ts), so it also needs SMS sending configured.
 *
 * UI only: this changes no permission or plan logic. Server-side; imports Prisma via subscription.ts.
 */

import type { SubscriptionPlan } from '@prisma/client';
import { planHasFeature } from '@/lib/subscription';

export const OPERATOR_CAPABILITIES = ['ONCALL', 'SHIFT_AUTOFILL'] as const;
export type OperatorCapability = (typeof OPERATOR_CAPABILITIES)[number];
export type OperatorCapabilities = Record<OperatorCapability, boolean>;

export const NO_CAPABILITIES: OperatorCapabilities = { ONCALL: false, SHIFT_AUTOFILL: false };

/**
 * @param role       the session user's role (both routes accept operators only)
 * @param plan       Operator.subscriptionPlan, or undefined when the user has no Operator row
 * @param smsConfigured smsService.isConfigured()
 */
export function operatorCapabilities(
  role: string | null | undefined,
  plan: SubscriptionPlan | null | undefined,
  smsConfigured: boolean,
): OperatorCapabilities {
  if (String(role || '').toUpperCase() !== 'OPERATOR' || plan === undefined) return NO_CAPABILITIES;
  const professional = planHasFeature(plan, 'PROFESSIONAL');
  return { SHIFT_AUTOFILL: professional, ONCALL: professional && smsConfigured };
}
