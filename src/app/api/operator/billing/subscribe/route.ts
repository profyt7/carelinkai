export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { UserRole } from '@prisma/client';
import { priceIdForPlan, planLabel } from '@/lib/operator-plans';
import { FOUNDER_TRIAL_DAYS, resolveFounderPromo } from '@/lib/billing/founder-code';

const SUPPORT_EMAIL = 'hello@getcarelinkai.com';

/**
 * POST /api/operator/billing/subscribe
 * Body: { plan: 'STARTER' | 'PROFESSIONAL' | 'GROWTH' | 'AGENCY', founderCode?: string }
 *
 * founderCode (FOUNDER_20 framework): a valid, active founder promotion code
 * applies 6 months free (180-day trial) + 20% off forever. Invalid codes get a
 * clean 400 BEFORE checkout is created — never a silently full-price session.
 *
 * Creates (or reuses) a Stripe Customer for the operator, then creates a
 * Stripe Checkout Session in subscription mode and returns the session URL.
 * The operator is redirected to Stripe-hosted checkout to enter payment details.
 * On success, Stripe fires customer.subscription.created which the webhook handler
 * persists back to the Operator record.
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user || user.role !== UserRole.OPERATOR) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const plan: string = (body.plan || 'STARTER').toUpperCase();

  // A tier is only purchasable if its Stripe Price ID is configured. If not, this
  // is a config gap (e.g. STRIPE_PRICE_AGENCY unset) — never show the operator an
  // env-var name; log the detail server-side and point them to support. The UI
  // hides unconfigured tiers, so reaching here means a stale client or direct call.
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    console.error(`[billing/subscribe] No Stripe Price ID for plan "${plan}" — STRIPE_PRICE_${plan} is not set.`);
    return NextResponse.json(
      { error: `The ${planLabel(plan)} plan isn't available for self-serve checkout yet. Email ${SUPPORT_EMAIL} and we'll set you up.` },
      { status: 400 }
    );
  }

  const operator = await prisma.operator.findUnique({ where: { userId: user.id } });
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  // Derive the base URL from the incoming request so the success/cancel URLs always
  // match the origin the user is actually browsing from. Falls back to the env var,
  // then the canonical production URL. This prevents session loss when NEXT_PUBLIC_APP_URL
  // differs from the actual host (e.g., Render internal URL vs custom domain).
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const requestOrigin = (forwardedProto && forwardedHost)
    ? `${forwardedProto}://${forwardedHost}`
    : request.headers.get('origin');
  const appUrl = requestOrigin || process.env['NEXT_PUBLIC_APP_URL'] || 'https://getcarelinkai.com';

  // Everything that talks to Stripe is wrapped so a Stripe/network failure returns
  // a clean, actionable message instead of a bodyless 500 that dead-ends the
  // operator mid-checkout (lost MRR + lost trust).
  try {
    // Create or retrieve Stripe customer
    let stripeCustomerId = operator.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: `${user.firstName} ${user.lastName}`.trim() || operator.companyName,
        metadata: { operatorId: operator.id, userId: user.id },
      });
      stripeCustomerId = customer.id;
      await prisma.operator.update({
        where: { id: operator.id },
        data: { stripeCustomerId },
      });
    }

    // FOUNDER_20 flow: validate the founder code up front so a typo'd code
    // fails loudly here instead of producing a full-price checkout session.
    let founderPromo = null;
    if (body.founderCode !== undefined && body.founderCode !== null && body.founderCode !== '') {
      founderPromo = await resolveFounderPromo(stripe, body.founderCode);
      if (!founderPromo) {
        return NextResponse.json(
          { error: `That founder code isn't valid or has been fully redeemed. Double-check the code, or email ${SUPPORT_EMAIL}.` },
          { status: 400 }
        );
      }
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        // Founder cohort: 6 months free; standard self-serve: 14-day trial.
        trial_period_days: founderPromo ? FOUNDER_TRIAL_DAYS : 14,
        metadata: { operatorId: operator.id, plan, ...(founderPromo ? { founderCode: founderPromo.code } : {}) },
      },
      // `discounts` and `allow_promotion_codes` are mutually exclusive in
      // Stripe Checkout — the founder code is the single controlled promo path.
      ...(founderPromo
        ? { discounts: [{ promotion_code: founderPromo.promotionCodeId }] }
        : { allow_promotion_codes: false }),
      success_url: `${appUrl}/operator/billing?subscription=success`,
      cancel_url: `${appUrl}/operator/billing?subscription=canceled`,
      metadata: { operatorId: operator.id, plan },
    });

    if (!checkoutSession.url) {
      console.error('[billing/subscribe] Stripe returned a checkout session with no URL.');
      return NextResponse.json(
        { error: `We couldn't start checkout right now. Please try again in a moment, or email ${SUPPORT_EMAIL}.` },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error('[billing/subscribe] Stripe error:', err);
    return NextResponse.json(
      { error: `We couldn't start checkout right now. Please try again in a moment, or email ${SUPPORT_EMAIL}.` },
      { status: 502 }
    );
  }
}
