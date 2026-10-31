/**
 * OL-248 — How-To guides say only what works with production flags as they are. The guide copy in
 * src/app/learn/howto/content.ts describes the full product; this trims it per flag at render time:
 *
 *  - On-Call AI (texts and calls caregivers) needs a Professional plan AND SMS sending
 *    (src/lib/operator/capabilities.ts) → hidden unless OPERATOR_PLANS is on and SMS is configured.
 *  - AI Shift Auto-fill and Billing / plan prices ("Professional — $249/mo") need operator plans
 *    → hidden unless OPERATOR_PLANS is on.
 *
 * Pure: `withLearnFlags(guide, flags)`; `currentLearnFlags()` reads the server's flags.
 */

import type { HowToGuide, HowToStep } from '@/app/learn/howto/content';

export type LearnFlags = { onCall: boolean; operatorPlans: boolean };

export const LEARN_FLAGS_OFF: LearnFlags = { onCall: false, operatorPlans: false };

const ON_CALL = /On-Call|oncall|text\/call|texts and calls|text and call|Send Next Wave|View Attempts|Coverage Need|reply(ing)? YES/i;
const AUTOFILL = /Auto-fill|autofill/i;
const BILLING = /Billing|billing|\$\d|plan\b|Plan\b|invoice|MRR|subscription/i;

/** Drop steps by predicate; a dropped section heading moves to the next kept step of that section. */
function dropSteps(steps: HowToStep[], drop: (s: HowToStep, section: string | undefined) => boolean): HowToStep[] {
  const out: HowToStep[] = [];
  let section: string | undefined;
  let pendingHeading: string | undefined;
  for (const step of steps) {
    if (step.section) {
      section = step.section;
      pendingHeading = step.section;
    }
    if (drop(step, section)) continue;
    if (pendingHeading && !step.section) out.push({ ...step, section: pendingHeading });
    else out.push(step);
    pendingHeading = undefined;
  }
  return out;
}

export function withLearnFlags(guide: HowToGuide, flags: LearnFlags): HowToGuide {
  if (guide.slug === 'shifts-and-oncall-ai') {
    const g = { ...guide };
    if (!flags.onCall) {
      g.title = flags.operatorPlans ? 'Shifts & AI Shift Auto-fill' : 'Shifts';
      g.steps = dropSteps(g.steps, (s, section) => ON_CALL.test(s.text) || ON_CALL.test(section ?? ''));
      g.tips = (g.tips ?? []).filter((t) => !ON_CALL.test(t));
      g.faq = (g.faq ?? []).filter((f) => !ON_CALL.test(f.q) && !ON_CALL.test(f.a));
      g.images = (g.images ?? []).filter((i) => !/oncall/i.test(i));
    }
    if (!flags.operatorPlans) {
      g.steps = dropSteps(g.steps, (s) => AUTOFILL.test(s.text));
      g.tips = (g.tips ?? []).filter((t) => !AUTOFILL.test(t));
    }
    g.summary = !flags.onCall
      ? flags.operatorPlans
        ? 'Use **Shifts** to create and assign caregiver shifts, with an **AI Shift Auto-fill** option on the Professional plan.'
        : 'Use **Shifts** to create caregiver shifts, assign them, and see them on a calendar. Caregivers can also claim open shifts you post.'
      : g.summary;
    g.whoFor = 'Operators scheduling caregivers and filling open shifts.';
    return g;
  }
  if (guide.slug === 'analytics-and-billing' && !flags.operatorPlans) {
    return {
      ...guide,
      title: 'Analytics',
      summary: '**Analytics** shows your occupancy and inquiry funnel, with a CSV export.',
      steps: dropSteps(guide.steps, (s, section) => section === 'Billing' || BILLING.test(s.text)),
      tips: (guide.tips ?? []).filter((t) => !BILLING.test(t)),
      faq: (guide.faq ?? []).filter((f) => !BILLING.test(f.q) && !BILLING.test(f.a)),
    };
  }
  if (!flags.onCall) {
    // Any other guide (e.g. the caregiver shifts FAQ) loses lines that promise On-Call texts or calls.
    const faq = (guide.faq ?? []).filter((f) => !ON_CALL.test(f.q) && !ON_CALL.test(f.a));
    const tips = (guide.tips ?? []).filter((t) => !/On-Call/i.test(t));
    if (faq.length !== (guide.faq ?? []).length || tips.length !== (guide.tips ?? []).length) return { ...guide, faq, tips };
  }
  return guide;
}

/** Server-side: the flags as production sees them. */
export async function currentLearnFlags(): Promise<LearnFlags> {
  const { isPaidFeatureEnabled } = await import('@/lib/billing/paid-features');
  const { smsService } = await import('@/lib/sms/sms-service');
  const operatorPlans = isPaidFeatureEnabled('OPERATOR_PLANS');
  return { operatorPlans, onCall: operatorPlans && smsService.isConfigured() };
}
