"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiHome, FiUsers, FiTrendingUp, FiFileText, FiCreditCard, FiPlus, FiAlertCircle, FiClock } from "react-icons/fi";
import { PermissionGuard, RoleGuard, useHasPermission } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/lib/permissions';
import AskAIWidget from '@/components/operator/dashboard/AskAIWidget';
import { usePaidFeature } from '@/hooks/usePaidFeatures';
import AtRiskAidesWidget from '@/components/operator/dashboard/AtRiskAidesWidget';

interface DashboardSummary {
  homes: number;
  inquiries: number;
  activeResidents: number;
  /** Listing-reported: occupiedBeds / licensedBeds across the operator's homes. */
  occupancyRate: number;
  occupiedBeds?: number;
  licensedBeds?: number;
  recentInquiries: any[];
  expiringLicenses: any[];
  newInquiriesCount: number;
}

/** "1 new inquiry", "2 new inquiries" (was "2 new inquirys"). */
export function newInquiryLabel(n: number): string {
  return `new ${n === 1 ? 'inquiry' : 'inquiries'}`;
}

interface Operator {
  id: string;
  companyName: string;
}

export default function OperatorDashboardPage() {
  const { enabled: plansEnabled } = usePaidFeature('OPERATOR_PLANS');
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const operatorId = searchParams?.get('operatorId') || null;

  const [summary, setSummary] = useState<DashboardSummary>({
    homes: 0,
    inquiries: 0,
    activeResidents: 0,
    occupancyRate: 0,
    recentInquiries: [],
    expiringLicenses: [],
    newInquiriesCount: 0,
  });
  const [operators, setOperators] = useState<Operator[]>([]);
  // Old payloads (no licensedBeds) keep showing the rate; a zero capacity shows "—", not 0%.
  const hasCapacity = summary.licensedBeds === undefined ? true : summary.licensedBeds > 0;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch dashboard summary
        const summaryRes = await fetch(`/api/operator/dashboard?operatorId=${operatorId || ''}`);
        if (!summaryRes.ok) {
          throw new Error(`Failed to fetch dashboard data: ${summaryRes.statusText}`);
        }
        const summaryData = await summaryRes.json();
        setSummary(summaryData);

        // Redirect new operators (no homes yet) to the onboarding wizard
        if (session?.user?.role === 'OPERATOR' && summaryData.homes === 0) {
          router.push('/operator/onboarding');
          return;
        }

        // Fetch operators list (for admin users)
        if (session?.user?.role === 'ADMIN') {
          const operatorsRes = await fetch('/api/operators');
          if (operatorsRes.ok) {
            const operatorsData = await operatorsRes.json();
            setOperators(operatorsData);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchDashboardData();
    }
  }, [session, operatorId]);

  const selected = operatorId || null;
  const selectedName = selected 
    ? operators.find(o => o.id === selected)?.companyName || 'Unknown Operator' 
    : 'All Operators';

  return (
    <div className="p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full border-4 border-t-primary-500 border-neutral-200 animate-spin"></div>
              <p className="text-neutral-600 font-medium">Loading dashboard...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border-2 border-error-300 bg-error-50 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-6 w-6 text-error-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-error-900 mb-2">Error Loading Dashboard</h3>
                <p className="text-sm text-error-800">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-4 btn btn-secondary text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* KPI cards - now clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/operator/homes" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Homes</div>
                <div className="mt-1 text-2xl font-semibold">{summary.homes}</div>
              </div>
              <FiHome className="h-8 w-8 text-primary-500" />
            </div>
          </Link>
          <Link href="/operator/inquiries" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                {/* summary.inquiries counts every inquiry, not only open ones. */}
                <div className="text-sm text-neutral-500">Total Inquiries</div>
                <div className="mt-1 text-2xl font-semibold">{summary.inquiries}</div>
                {summary.newInquiriesCount > 0 && (
                  <div className="mt-1 text-xs text-error-600 font-medium">{summary.newInquiriesCount} new</div>
                )}
              </div>
              <FiFileText className="h-8 w-8 text-primary-500" />
            </div>
          </Link>
          <Link href="/operator/residents" className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Residents in CareLinkAI</div>
                <div className="mt-1 text-2xl font-semibold">{summary.activeResidents}</div>
                <div className="mt-1 text-xs text-neutral-500">Active resident records</div>
              </div>
              <FiUsers className="h-8 w-8 text-success-500" />
            </div>
          </Link>
          {/* Listing-reported occupancy (beds occupied / capacity on the listings), not resident records. */}
          <div className={`card ${!hasCapacity ? '' : summary.occupancyRate < 50 ? 'border-error-200 bg-error-50' : summary.occupancyRate < 80 ? 'border-warning-200 bg-warning-50' : ''}`} data-testid="occupancy-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Listing Occupancy</div>
                <div className="mt-1 text-2xl font-semibold">{hasCapacity ? `${summary.occupancyRate}%` : '—'}</div>
                <div className="mt-1 text-xs text-neutral-500">
                  {hasCapacity
                    ? `${summary.occupiedBeds ?? 0} of ${summary.licensedBeds} beds, as reported on your listings`
                    : 'Add bed capacity to your listings'}
                </div>
              </div>
              <FiTrendingUp className={`h-8 w-8 ${!hasCapacity ? 'text-neutral-400' : summary.occupancyRate < 50 ? 'text-error-500' : summary.occupancyRate < 80 ? 'text-warning-500' : 'text-success-500'}`} />
            </div>
          </div>
        </div>

        {/* AI Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AskAIWidget />
          <AtRiskAidesWidget />
        </div>

        {/* Critical Alerts */}
        {(summary.newInquiriesCount > 0 || summary.expiringLicenses.length > 0) && (
          <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">Action Required</h3>
                <div className="space-y-2 text-sm">
                  {summary.newInquiriesCount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800">
                        <strong>{summary.newInquiriesCount}</strong> {newInquiryLabel(summary.newInquiriesCount)} waiting for response
                      </span>
                      <Link href="/operator/inquiries" className="text-amber-900 hover:underline font-medium">
                        View →
                      </Link>
                    </div>
                  )}
                  {summary.expiringLicenses.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800">
                        <strong>{summary.expiringLicenses.length}</strong> license{summary.expiringLicenses.length > 1 ? 's' : ''} expiring within 30 days
                      </span>
                      <Link href="/operator/compliance" className="text-amber-900 hover:underline font-medium">
                        View →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="text-lg font-semibold text-neutral-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PermissionGuard permission={PERMISSIONS.HOMES_CREATE}>
              <Link 
                href="/operator/homes/new"
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-primary-300 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <div className="rounded-full bg-primary-100 p-2">
                  <FiPlus className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <div className="font-medium text-neutral-800">Add Home</div>
                  <div className="text-xs text-neutral-500">Create new listing</div>
                </div>
              </Link>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.RESIDENTS_CREATE}>
              <Link 
                href="/operator/residents/new"
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-success-300 hover:border-success-500 hover:bg-success-50 transition-colors"
              >
                <div className="rounded-full bg-success-100 p-2">
                  <FiPlus className="h-5 w-5 text-success-600" />
                </div>
                <div>
                  <div className="font-medium text-neutral-800">Add Resident</div>
                  <div className="text-xs text-neutral-500">Onboard new resident</div>
                </div>
              </Link>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.INQUIRIES_VIEW}>
              <Link 
                href="/operator/inquiries"
                className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-primary-300 hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <div className="rounded-full bg-primary-100 p-2">
                  <FiFileText className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <div className="font-medium text-neutral-800">View Inquiries</div>
                  <div className="text-xs text-neutral-500">Manage leads</div>
                </div>
              </Link>
            </PermissionGuard>
          </div>
        </div>

        {/* Recent Activity */}
        {summary.recentInquiries.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800">Recent Activity</h3>
              <Link href="/operator/inquiries" className="text-sm text-primary-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {summary.recentInquiries.map((inquiry: any) => (
                <Link 
                  key={inquiry.id} 
                  href={`/operator/inquiries/${inquiry.id}`}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200"
                >
                  <div className="rounded-full bg-primary-100 p-2 mt-1">
                    <FiFileText className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-neutral-800 truncate">
                        New inquiry from {inquiry.family?.name || 'Unknown'}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-neutral-500 flex-shrink-0">
                        <FiClock className="h-3 w-3" />
                        {new Date(inquiry.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-sm text-neutral-600 truncate">{inquiry.home?.name}</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                        inquiry.status === 'NEW' ? 'bg-error-100 text-error-700' :
                        inquiry.status === 'CONTACTED' ? 'bg-primary-100 text-primary-700' :
                        inquiry.status === 'TOUR_SCHEDULED' ? 'bg-warning-100 text-warning-700' :
                        inquiry.status === 'PLACEMENT_ACCEPTED' ? 'bg-success-100 text-success-700' :
                        'bg-neutral-100 text-neutral-700'
                      }`}>
                        {inquiry.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link className="card hover:shadow-md transition" href="/operator/homes">
            <div className="text-lg font-medium">Manage Homes</div>
            <div className="text-sm text-neutral-500">Create, edit, and track homes</div>
          </Link>
          <Link className="card hover:shadow-md transition" href="/operator/analytics">
            <div className="text-lg font-medium">Analytics</div>
            <div className="text-sm text-neutral-500">Occupancy and funnel trends</div>
          </Link>
          <Link className="card hover:shadow-md transition" href="/operator/compliance">
            <div className="text-lg font-medium">Compliance</div>
            <div className="text-sm text-neutral-500">Licensing and inspections</div>
          </Link>
          {plansEnabled && (
            <Link className="card hover:shadow-md transition" href="/operator/billing">
              <div className="text-lg font-medium">Billing</div>
              <div className="text-sm text-neutral-500">Deposits and monthly fees</div>
            </Link>
          )}
        </div>
        </>
        )}
    </div>
  );
}
