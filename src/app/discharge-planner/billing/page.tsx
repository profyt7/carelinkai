'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Profile {
  subscriptionStatus: string | null;
  licenseType: string | null;
  seatCount: number | null;
  trialEndsAt: string | null;
  currentPeriodEndsAt: string | null;
  organization: string | null;
}

const INDIVIDUAL_FEATURES = [
  'AI-powered placement search across all CareLinkAI homes',
  'Placement request management and history',
  'Analytics dashboard — placements, response times, outcomes',
  'Priority support from our care coordination team',
  'HIPAA-aligned data handling',
];

const DEPT_FEATURES = [
  'Everything in Individual, plus:',
  'Up to 10 planner seats under one invoice',
  'Department-level placement analytics & outcome reports',
  'Single PO / billing contact for the whole team',
  'Onboarding call with the CareLinkAI team',
];

export default function DischargePlannerBillingPage() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<'INDIVIDUAL' | 'DEPARTMENT' | null>(null);

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

  const handleSubscribe = async (licenseType: 'INDIVIDUAL' | 'DEPARTMENT') => {
    if (subscribing) return;
    setSubscribing(licenseType);
    try {
      const res = await fetch('/api/discharge-planner/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || 'Failed to start checkout');
      setSubscribing(null);
    }
  };

  const isActive =
    profile?.subscriptionStatus === 'ACTIVE' || profile?.subscriptionStatus === 'TRIALING';

  if (loading) {
    return (
      <DashboardLayout title="Billing" showSearch={false}>
        <div className="p-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-primary-500" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Billing" showSearch={false}>
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-neutral-900 mb-2">Discharge Planner Subscription</h1>
      <p className="text-neutral-500 mb-8">
        Access AI-powered placement search, history, and analytics for your patients.
      </p>

      {isActive ? (
        <div className="rounded-lg border border-success-200 bg-success-50 p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-success-100 text-success-800">
              {profile?.subscriptionStatus === 'TRIALING' ? 'Trial Active' : 'Active'}
            </span>
            <span className="text-neutral-600 text-sm">
              {profile?.licenseType === 'DEPARTMENT'
                ? `CareLinkAI Discharge Planner — Department License (up to ${profile.seatCount ?? 10} seats) — $499/month`
                : 'CareLinkAI Discharge Planner — Individual — $99/seat/month'}
            </span>
          </div>
          {profile?.subscriptionStatus === 'TRIALING' && profile.trialEndsAt && (
            <p className="text-sm text-success-700">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Individual plan */}
          <div className="rounded-lg border border-neutral-200 bg-white p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Individual</p>
              <div className="text-3xl font-bold text-neutral-900">
                $99<span className="text-lg font-normal text-neutral-500">/seat/mo</span>
              </div>
              <p className="text-neutral-500 text-sm mt-1">14-day free trial. Cancel anytime.</p>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {INDIVIDUAL_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                  <svg className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('INDIVIDUAL')}
              disabled={!!subscribing}
              className="w-full py-2.5 px-4 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
            >
              {subscribing === 'INDIVIDUAL' ? 'Redirecting…' : 'Start Free Trial'}
            </button>
          </div>

          {/* Department plan */}
          <div className="rounded-lg border-2 border-primary-500 bg-white p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Best for Teams</span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Department</p>
              <div className="text-3xl font-bold text-neutral-900">
                $499<span className="text-lg font-normal text-neutral-500">/mo</span>
              </div>
              <p className="text-neutral-500 text-sm mt-1">Up to 10 seats · one invoice · 14-day trial.</p>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {DEPT_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                  <svg className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe('DEPARTMENT')}
              disabled={!!subscribing}
              className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 transition-colors"
            >
              {subscribing === 'DEPARTMENT' ? 'Redirecting…' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-neutral-400 text-center mt-6">No credit card required during trial</p>
    </div>
    </DashboardLayout>
  );
}
