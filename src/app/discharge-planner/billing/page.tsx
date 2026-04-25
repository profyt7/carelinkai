'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Profile {
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  organization: string | null;
}

export default function DischargePlannerBillingPage() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      toast.success('Subscription activated! Welcome to CareLinkAI Pro.');
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/discharge-planner/billing/subscription');
      const data = await res.json();
      setProfile(data.profile);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (subscribing) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/discharge-planner/billing/subscribe', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || 'Failed to start checkout');
      setSubscribing(false);
    }
  };

  const isActive =
    profile?.subscriptionStatus === 'ACTIVE' || profile?.subscriptionStatus === 'TRIALING';

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Discharge Planner Subscription</h1>
      <p className="text-neutral-500 mb-8">
        Access AI-powered placement search, history, and analytics for your patients.
      </p>

      {isActive ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {profile?.subscriptionStatus === 'TRIALING' ? 'Trial Active' : 'Active'}
            </span>
            <span className="text-neutral-600 text-sm">CareLinkAI Discharge Planner — $99/seat/month</span>
          </div>
          {profile?.subscriptionStatus === 'TRIALING' && profile.trialEndsAt && (
            <p className="text-sm text-green-700">
              Trial ends {new Date(profile.trialEndsAt).toLocaleDateString()}
            </p>
          )}
          {profile?.currentPeriodEndsAt && profile.subscriptionStatus === 'ACTIVE' && (
            <p className="text-sm text-neutral-500">
              Next billing date: {new Date(profile.currentPeriodEndsAt).toLocaleDateString()}
            </p>
          )}
          <p className="text-sm text-neutral-500 mt-3">
            To cancel or update payment, contact{' '}
            <a href="mailto:billing@getcarelinkai.com" className="text-primary-600 underline">
              billing@getcarelinkai.com
            </a>
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-6">
            <div className="text-4xl font-bold text-neutral-900">
              $99<span className="text-xl font-normal text-neutral-500">/seat/month</span>
            </div>
            <p className="text-neutral-500 mt-1">14-day free trial. Cancel anytime.</p>
          </div>

          <ul className="space-y-3 mb-6">
            {[
              'AI-powered placement search across all CareLinkAI homes',
              'Placement request management and history',
              'Analytics dashboard — placements, response times, outcomes',
              'Priority support from our care coordination team',
              'HIPAA-compliant data handling',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-neutral-700">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={subscribing}
            className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {subscribing ? 'Redirecting to checkout...' : 'Start Free Trial'}
          </button>

          <p className="text-xs text-neutral-400 text-center mt-3">
            No credit card required during trial
          </p>
        </div>
      )}
    </div>
  );
}
