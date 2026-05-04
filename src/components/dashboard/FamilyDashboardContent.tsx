"use client";

import React, { useEffect, useState } from 'react';
import { MetricCard } from './MetricCard';
import { AlertCard } from './AlertCard';
import { DashboardSkeleton } from './DashboardSkeleton';
import { FileText, Calendar, CheckCircle, MapPin, Zap, Car, MessageCircle, Heart, Star } from 'lucide-react';
import Link from 'next/link';

interface Metrics {
  inquiryStatus?: {
    value: string;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  };
  tourSchedule?: {
    value: string;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  } | null;
  applicationProgress?: {
    value: string;
    subtitle: string;
    trend: 'up' | 'down' | 'neutral';
    trendValue: number;
  } | null;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  timestamp?: Date | string | null;
}

export function FamilyDashboardContent() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlus, setIsPlus] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [metricsRes, alertsRes, profileRes] = await Promise.all([
          fetch('/api/dashboard/metrics', { cache: 'no-store' }),
          fetch('/api/dashboard/alerts', { cache: 'no-store' }),
          fetch('/api/profile', { cache: 'no-store' }),
        ]);

        if (!metricsRes.ok || !alertsRes.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const [metricsData, alertsData] = await Promise.all([
          metricsRes.json(),
          alertsRes.json(),
        ]);

        setMetrics(metricsData);
        setAlerts(alertsData?.alerts || []);

        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setIsPlus(!!profileData?.data?.family?.isPlus);
          setUserName(profileData?.data?.user?.firstName || null);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-error-50 border border-error-200 rounded-lg p-4 text-error-800">
          <p className="font-medium">Error loading dashboard</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">

      {/* Plus member banner */}
      {isPlus ? (
        <div className="mb-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 p-5 text-white shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                <Star size={20} className="text-white fill-white" />
              </div>
              <div>
                <div className="font-bold text-lg">
                  {userName ? `Welcome back, ${userName}!` : 'Welcome back!'}{' '}
                  <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-1 align-middle">PLUS</span>
                </div>
                <p className="text-amber-100 text-sm">You have priority matching, unlimited saves, and priority Care Concierge access.</p>
              </div>
            </div>
            <Link href="/settings/family/billing" className="text-xs font-semibold text-amber-100 hover:text-white underline underline-offset-2">
              Manage subscription →
            </Link>
          </div>
        </div>
      ) : (
        /* Header for non-Plus */
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">My Dashboard</h1>
          <p className="text-sm text-neutral-600 mt-1">Track your inquiry and application progress</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {metrics?.inquiryStatus && (
          <MetricCard
            title="Inquiry Status"
            value={metrics.inquiryStatus.value}
            subtitle={metrics.inquiryStatus.subtitle}
            icon={FileText}
            trend={metrics.inquiryStatus.trend}
            href="/dashboard/inquiries"
          />
        )}
        {metrics?.tourSchedule && (
          <MetricCard
            title="Tour Schedule"
            value={metrics.tourSchedule.value}
            subtitle={metrics.tourSchedule.subtitle}
            icon={Calendar}
            trend={metrics.tourSchedule.trend}
            href="/dashboard/inquiries"
          />
        )}
        {metrics?.applicationProgress && (
          <MetricCard
            title="Application Progress"
            value={metrics.applicationProgress.value}
            subtitle={metrics.applicationProgress.subtitle}
            icon={CheckCircle}
            trend={metrics.applicationProgress.trend}
            trendValue={metrics.applicationProgress.trendValue}
          />
        )}
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Important Updates</h2>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/dashboard/inquiries"
            className="bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg p-4 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <FileText size={24} className="text-primary-600" />
              <div>
                <h3 className="font-medium text-neutral-900">My Inquiries</h3>
                <p className="text-sm text-neutral-600">View inquiry status</p>
              </div>
            </div>
          </Link>
          <Link
            href="/search"
            className="bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg p-4 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <MapPin size={24} className="text-primary-600" />
              <div>
                <h3 className="font-medium text-neutral-900">Search Homes</h3>
                <p className="text-sm text-neutral-600">Find assisted living</p>
              </div>
            </div>
          </Link>
          <Link
            href="/rides"
            className="bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg p-4 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <Car size={24} className="text-primary-600" />
              <div>
                <h3 className="font-medium text-neutral-900">My Rides</h3>
                <p className="text-sm text-neutral-600">Book & manage transport</p>
              </div>
            </div>
          </Link>
          <Link
            href="/favorites"
            className="bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg p-4 transition-colors duration-200"
          >
            <div className="flex items-center space-x-3">
              <Heart size={24} className="text-primary-600" />
              <div>
                <h3 className="font-medium text-neutral-900">Saved Homes</h3>
                <p className="text-sm text-neutral-600">View your shortlist</p>
              </div>
            </div>
          </Link>
          {isPlus && (
            <Link
              href="/marketplace?tab=providers&serviceType=transportation"
              className="sm:col-span-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg p-4 transition-colors duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-neutral-900">Priority Care Concierge</h3>
                    <span className="text-xs font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded">PLUS</span>
                  </div>
                  <p className="text-sm text-neutral-600">Your Plus membership gets you priority response from our care advisors. Ask anything about senior care, placement, or your options.</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Non-Plus upsell */}
      {!isPlus && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-neutral-900">Upgrade to CareLinkAI Plus — $19/mo</h3>
              <p className="text-sm text-neutral-600 mt-1">Priority matching, unlimited saved homes, priority Care Concierge, and early access to new features. 14-day free trial, cancel anytime.</p>
            </div>
            <Link
              href="/settings/family/billing"
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Try Free →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
