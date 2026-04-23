'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, CreditCard, ArrowUpRight, Zap } from 'lucide-react';

interface SubscriptionData {
  id: string;
  subscriptionPlan: 'STARTER' | 'PROFESSIONAL' | 'GROWTH' | 'ENTERPRISE' | null;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' | 'INCOMPLETE_EXPIRED' | 'PAUSED' | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
}

const PLAN_DETAILS = {
  STARTER:      { label: 'Starter',      price: '$99/mo',  color: 'blue',   homes: '1 home' },
  PROFESSIONAL: { label: 'Professional', price: '$249/mo', color: 'purple', homes: 'Up to 3 homes' },
  GROWTH:       { label: 'Growth',       price: '$499/mo', color: 'green',  homes: 'Up to 10 homes' },
  ENTERPRISE:   { label: 'Enterprise',   price: 'Custom',  color: 'orange', homes: 'Unlimited homes' },
};

const PLAN_ORDER = ['STARTER', 'PROFESSIONAL', 'GROWTH'];

function StatusBadge({ status }: { status: SubscriptionData['subscriptionStatus'] }) {
  switch (status) {
    case 'ACTIVE':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3" /> Active</span>;
    case 'TRIALING':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3" /> Free Trial</span>;
    case 'PAST_DUE':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3" /> Past Due</span>;
    case 'CANCELED':
    case 'INCOMPLETE_EXPIRED':
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> Canceled</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No Plan</span>;
  }
}

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/operator/billing/subscription')
      .then((r) => r.json())
      .then((d) => setSubscription(d.subscription))
      .catch(() => setError('Could not load subscription data.'))
      .finally(() => setLoading(false));
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
      if (!res.ok) {
        setError(data.error || 'Failed to start checkout.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Failed to start checkout. Please try again.');
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
      if (!res.ok) {
        setError(data.error || 'Failed to open billing portal.');
        return;
      }
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
        <div className="h-5 bg-gray-200 rounded w-40 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-32" />
      </div>
    );
  }

  const hasActivePlan = subscription?.subscriptionStatus === 'ACTIVE' || subscription?.subscriptionStatus === 'TRIALING';
  const planDetails = subscription?.subscriptionPlan ? PLAN_DETAILS[subscription.subscriptionPlan] : null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
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
              <div className="text-sm text-blue-600 mt-1">
                Trial ends {new Date(subscription.trialEndsAt).toLocaleDateString()}
              </div>
            )}
            {subscription?.subscriptionStatus === 'ACTIVE' && subscription.currentPeriodEndsAt && (
              <div className="text-sm text-neutral-500 mt-1">
                Next billing {new Date(subscription.currentPeriodEndsAt).toLocaleDateString()}
              </div>
            )}
            {subscription?.subscriptionStatus === 'PAST_DUE' && (
              <div className="text-sm text-yellow-700 mt-1 font-medium">
                Payment failed — update your payment method to restore access.
              </div>
            )}
          </div>

          {hasActivePlan && (
            <button
              onClick={handleManage}
              disabled={actionLoading === 'portal'}
              className="btn btn-secondary flex items-center gap-2 self-start sm:self-auto"
            >
              <CreditCard className="w-4 h-4" />
              {actionLoading === 'portal' ? 'Opening...' : 'Manage Billing'}
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Plan selection (shown when no active plan) */}
      {!hasActivePlan && (
        <div>
          <div className="text-sm font-medium text-neutral-700 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Choose a plan — 14-day free trial, no credit card required at signup
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLAN_ORDER.map((plan) => {
              const details = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS];
              const isLoading = actionLoading === plan;
              return (
                <div
                  key={plan}
                  className="border border-neutral-200 rounded-xl p-4 flex flex-col gap-3 hover:border-blue-400 hover:shadow-sm transition-all"
                >
                  <div>
                    <div className="font-semibold text-base">{details.label}</div>
                    <div className="text-2xl font-bold mt-0.5">{details.price}</div>
                    <div className="text-xs text-neutral-500">{details.homes}</div>
                  </div>
                  {plan === 'STARTER' && (
                    <ul className="text-xs text-neutral-600 space-y-1">
                      <li>✓ Inquiry pipeline</li>
                      <li>✓ Resident management</li>
                      <li>✓ Email support</li>
                    </ul>
                  )}
                  {plan === 'PROFESSIONAL' && (
                    <ul className="text-xs text-neutral-600 space-y-1">
                      <li>✓ Everything in Starter</li>
                      <li>✓ AI inquiry responses</li>
                      <li>✓ Caregiver management</li>
                      <li>✓ Tour scheduling + analytics</li>
                    </ul>
                  )}
                  {plan === 'GROWTH' && (
                    <ul className="text-xs text-neutral-600 space-y-1">
                      <li>✓ Everything in Professional</li>
                      <li>✓ Discharge planner integration</li>
                      <li>✓ Advanced analytics</li>
                      <li>✓ Priority support</li>
                    </ul>
                  )}
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
