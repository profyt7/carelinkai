'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, CreditCard, ArrowUpRight, Zap, RefreshCw, FileText, Download, ExternalLink } from 'lucide-react';

interface InvoiceData {
  id: string;
  stripeInvoiceId: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  amountDue: number;
  amountPaid: number;
  currency: string;
  description: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  invoiceUrl: string | null;
  invoicePdf: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface SubscriptionData {
  id: string;
  subscriptionPlan: 'STARTER' | 'PROFESSIONAL' | 'GROWTH' | 'AGENCY' | 'ENTERPRISE' | null;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAUSED' | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
}

const PLAN_DETAILS = {
  STARTER:      { label: 'Starter',      price: '$99/mo',   homes: '1 home',            features: ['Inquiry pipeline', 'Resident management', 'Email support'] },
  PROFESSIONAL: { label: 'Professional', price: '$249/mo',  homes: 'Up to 3 homes',     features: ['Everything in Starter', 'AI inquiry responses', 'On-Call AI', 'Caregiver management', 'Tour scheduling + analytics'] },
  GROWTH:       { label: 'Growth',       price: '$499/mo',  homes: 'Up to 10 homes',    features: ['Everything in Professional', 'Discharge planner integration', 'Advanced analytics', 'Priority support', 'Unlimited marketplace hires'] },
  AGENCY:       { label: 'Agency',       price: '$799/mo',  homes: 'Multi-location',    features: ['Everything in Growth', 'Agency staffing dashboard', 'Bulk caregiver hiring', 'Contractor & W2 management', 'Volume hire discounts'] },
  ENTERPRISE:   { label: 'Enterprise',   price: 'Custom',   homes: 'Unlimited homes',   features: ['Everything in Agency', 'White-label', 'Dedicated support', 'EHR integration'] },
};

const PLAN_ORDER: Array<'STARTER' | 'PROFESSIONAL' | 'GROWTH' | 'AGENCY'> = ['STARTER', 'PROFESSIONAL', 'GROWTH', 'AGENCY'];

const PLAN_RANK: Record<string, number> = { STARTER: 1, PROFESSIONAL: 2, GROWTH: 3, AGENCY: 3, ENTERPRISE: 4 };

function StatusBadge({ status }: { status: SubscriptionData['subscriptionStatus'] }) {
  switch (status) {
    case 'ACTIVE':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800"><CheckCircle className="w-3 h-3" /> Active</span>;
    case 'TRIALING':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"><Clock className="w-3 h-3" /> Free Trial</span>;
    case 'PAST_DUE':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800"><AlertTriangle className="w-3 h-3" /> Past Due</span>;
    case 'CANCELED':
    case 'INCOMPLETE_EXPIRED':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800"><XCircle className="w-3 h-3" /> Canceled</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">No Plan</span>;
  }
}

function formatCents(cents: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

function InvoiceStatusBadge({ status }: { status: InvoiceData['status'] }) {
  switch (status) {
    case 'PAID':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">Paid</span>;
    case 'OPEN':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-800">Open</span>;
    case 'VOID':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">Void</span>;
    case 'UNCOLLECTIBLE':
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-700">Uncollectible</span>;
    default:
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">Draft</span>;
  }
}

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPlanChange, setShowPlanChange] = useState(false);
  // Tiers with a configured Stripe price. null = not loaded; until then we hide
  // AGENCY so a tier that would dead-end at checkout never appears as buyable.
  const [availablePlans, setAvailablePlans] = useState<string[] | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/operator/billing/subscription').then((r) => r.json()),
      fetch('/api/operator/billing/invoices').then((r) => r.json()),
    ])
      .then(([subData, invData]) => {
        setSubscription(subData.subscription);
        setInvoices(invData.invoices ?? []);
      })
      .catch(() => setError('Could not load billing data.'))
      .finally(() => setLoading(false));

    fetch('/api/operator/billing/plans')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d?.available)) setAvailablePlans(d.available); })
      .catch(() => {});
  }, []);

  async function handleSubscribe(plan: string) {
    setActionLoading(plan);
    setError(null);
    try {
      const res = await fetch('/api/operator/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to start checkout.'); return; }
      window.location.href = data.url;
    } catch {
      setError('Failed to start checkout. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSwitchPlan(plan: string) {
    setActionLoading(plan);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/operator/billing/switch-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to switch plan.'); return; }
      setSubscription((prev) => prev ? { ...prev, subscriptionPlan: plan as any } : prev);
      setSuccess(`Switched to ${data.label} plan successfully.`);
      setShowPlanChange(false);
    } catch {
      setError('Failed to switch plan. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleManage() {
    setActionLoading('portal');
    setError(null);
    try {
      const res = await fetch('/api/operator/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to open billing portal.'); return; }
      window.location.href = data.url;
    } catch {
      setError('Failed to open billing portal. Please try again.');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-5 bg-neutral-200 rounded w-40 mb-3" />
        <div className="h-8 bg-neutral-200 rounded w-32" />
      </div>
    );
  }

  const hasActivePlan = subscription?.subscriptionStatus === 'ACTIVE' || subscription?.subscriptionStatus === 'TRIALING';
  const currentPlan = subscription?.subscriptionPlan;
  const planDetails = currentPlan ? PLAN_DETAILS[currentPlan] : null;
  const currentRank = currentPlan ? (PLAN_RANK[currentPlan] ?? 0) : 0;
  // Show a tier if it's purchasable (configured Stripe price) or it's the
  // operator's current plan. Until availability loads, hide AGENCY so a tier
  // that would dead-end at checkout never appears.
  const visiblePlans = PLAN_ORDER.filter((plan) =>
    plan === currentPlan ||
    (availablePlans === null ? plan !== 'AGENCY' : availablePlans.includes(plan))
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-3 text-sm text-error-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-success-50 border border-success-200 px-4 py-3 text-sm text-success-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Current plan card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-sm text-neutral-500 mb-1">Current Plan</div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold">
                {planDetails ? planDetails.label : 'No active plan'}
              </span>
              <StatusBadge status={subscription?.subscriptionStatus ?? null} />
            </div>
            {planDetails && (
              <div className="text-sm text-neutral-500 mt-0.5">{planDetails.price} · {planDetails.homes}</div>
            )}
            {subscription?.subscriptionStatus === 'TRIALING' && subscription.trialEndsAt && (
              <div className="text-sm text-primary-600 mt-1">
                Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
              </div>
            )}
            {subscription?.subscriptionStatus === 'ACTIVE' && subscription.currentPeriodEndsAt && (
              <div className="text-sm text-neutral-500 mt-1">
                Next billing {new Date(subscription.currentPeriodEndsAt).toLocaleDateString()}
              </div>
            )}
            {subscription?.subscriptionStatus === 'PAST_DUE' && (
              <div className="text-sm text-warning-700 mt-1 font-medium">
                Payment failed — update your payment method to restore access.
              </div>
            )}
          </div>

          {hasActivePlan && (
            <div className="flex flex-col sm:flex-row gap-2 self-start sm:self-auto">
              <button
                onClick={() => { setShowPlanChange(!showPlanChange); setError(null); setSuccess(null); }}
                className="btn btn-secondary flex items-center gap-2 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                {showPlanChange ? 'Cancel' : 'Change Plan'}
              </button>
              <button
                onClick={handleManage}
                disabled={actionLoading === 'portal'}
                className="btn btn-secondary flex items-center gap-2 text-sm"
              >
                <CreditCard className="w-4 h-4" />
                {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
                <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* In-app plan switcher */}
      {hasActivePlan && showPlanChange && (
        <div>
          <div className="text-sm font-medium text-neutral-700 mb-3">
            Select a new plan — changes take effect immediately with prorated billing.
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {visiblePlans.map((plan) => {
              const details = PLAN_DETAILS[plan];
              const isCurrent = plan === currentPlan;
              const isUpgrade = PLAN_RANK[plan] > currentRank;
              const isLoading = actionLoading === plan;
              return (
                <div
                  key={plan}
                  className={`border-2 rounded-xl p-4 flex flex-col gap-3 transition-all ${
                    isCurrent ? 'border-primary-400 bg-primary-50' : 'border-neutral-200 hover:border-primary-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-base">{details.label}</div>
                      {isCurrent && <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">Current</span>}
                      {!isCurrent && isUpgrade && <span className="text-xs font-medium text-success-600 bg-success-100 px-2 py-0.5 rounded-full">Upgrade</span>}
                      {!isCurrent && !isUpgrade && <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Downgrade</span>}
                    </div>
                    <div className="text-2xl font-bold">{details.price}</div>
                    <div className="text-xs text-neutral-500">{details.homes}</div>
                  </div>
                  <ul className="text-xs text-neutral-600 space-y-1 flex-1">
                    {details.features.map((f) => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <button
                    onClick={() => handleSwitchPlan(plan)}
                    disabled={isCurrent || !!actionLoading}
                    className={`btn text-sm mt-auto ${isCurrent ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'}`}
                  >
                    {isLoading ? 'Switching...' : isCurrent ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-neutral-400 mt-3">
            Need unlimited homes?{' '}
            <a href="mailto:hello@getcarelinkai.com" className="underline">Contact us for Enterprise pricing.</a>
          </p>
        </div>
      )}

      {/* Invoice history */}
      {invoices.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-neutral-500" />
            <h3 className="font-semibold text-neutral-800">Invoice History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500 border-b border-neutral-100">
                  <th className="pb-2 font-medium pr-4">Period</th>
                  <th className="pb-2 font-medium pr-4">Amount</th>
                  <th className="pb-2 font-medium pr-4">Status</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50">
                    <td className="py-3 pr-4 text-neutral-700">
                      {inv.periodStart && inv.periodEnd
                        ? `${new Date(inv.periodStart).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${new Date(inv.periodEnd).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                        : new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4 font-medium text-neutral-800">
                      {formatCents(inv.status === 'PAID' ? inv.amountPaid : inv.amountDue, inv.currency)}
                    </td>
                    <td className="py-3 pr-4">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        {inv.invoiceUrl && (
                          <a
                            href={inv.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        )}
                        {inv.invoicePdf && (
                          <a
                            href={inv.invoicePdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-800"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plan selection (shown when no active plan) */}
      {!hasActivePlan && (
        <div>
          <div className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Choose a plan — 14-day free trial, no credit card required at signup
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {visiblePlans.map((plan) => {
              const details = PLAN_DETAILS[plan];
              const isLoading = actionLoading === plan;
              return (
                <div
                  key={plan}
                  className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-3 hover:border-primary-400 hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="font-semibold text-base">{details.label}</div>
                    <div className="text-2xl font-bold mt-0.5">{details.price}</div>
                    <div className="text-xs text-neutral-500">{details.homes}</div>
                  </div>
                  <ul className="text-xs text-neutral-600 space-y-1 flex-1">
                    {details.features.map((f) => <li key={f}>✓ {f}</li>)}
                  </ul>
                  <button
                    onClick={() => handleSubscribe(plan)}
                    disabled={!!actionLoading}
                    className="btn btn-primary mt-auto text-sm"
                  >
                    {isLoading ? 'Starting...' : 'Start Free Trial'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-neutral-400 mt-3">
            Need unlimited homes or white-label?{' '}
            <a href="mailto:hello@getcarelinkai.com" className="underline">Contact us for Enterprise pricing.</a>
          </p>
        </div>
      )}
    </div>
  );
}
