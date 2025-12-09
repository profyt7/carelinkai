"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FiHome, FiUsers, FiTrendingUp, FiFileText, FiCreditCard, FiPlus, FiAlertCircle, FiClock } from "react-icons/fi";

interface DashboardSummary {
  homes: number;
  inquiries: number;
  activeResidents: number;
  occupancyRate: number;
  recentInquiries: any[];
  expiringLicenses: any[];
  newInquiriesCount: number;
}

interface Operator {
  id: string;
  companyName: string;
}

export default function OperatorDashboardPage() {
  const { data: session } = useSession();
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
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
                <p className="text-sm text-red-800">{error}</p>
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
        {/* Admin operator scope selector */}
        {session?.user?.role === 'ADMIN' && (
          <div className="card">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-sm text-neutral-500">Viewing scope</div>
                <div className="text-lg font-medium">{selectedName}</div>
              </div>
              <form method="GET" className="flex items-center gap-2">
                <label className="text-sm text-neutral-600" htmlFor="operatorId">Operator</label>
                <select id="operatorId" name="operatorId" defaultValue={selected || ''} className="form-select">
                  <option value="">All Operators</option>
                  {operators.map(op => (
                    <option key={op.id} value={op.id}>{op.companyName}</option>
                  ))}
                </select>
                <button className="btn btn-secondary" type="submit">Apply</button>
              </form>
            </div>
          </div>
        )}
        {/* KPI cards - now clickable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href={`/operator/homes${selected ? `?operatorId=${selected}` : ''}`} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Homes</div>
                <div className="mt-1 text-2xl font-semibold">{summary.homes}</div>
              </div>
              <FiHome className="h-8 w-8 text-primary-500" />
            </div>
          </Link>
          <Link href={`/operator/inquiries${selected ? `?operatorId=${selected}` : ''}`} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Open Inquiries</div>
                <div className="mt-1 text-2xl font-semibold">{summary.inquiries}</div>
                {summary.newInquiriesCount > 0 && (
                  <div className="mt-1 text-xs text-red-600 font-medium">{summary.newInquiriesCount} new</div>
                )}
              </div>
              <FiFileText className="h-8 w-8 text-blue-500" />
            </div>
          </Link>
          <Link href={`/operator/residents${selected ? `?operatorId=${selected}` : ''}`} className="card hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Active Residents</div>
                <div className="mt-1 text-2xl font-semibold">{summary.activeResidents}</div>
              </div>
              <FiUsers className="h-8 w-8 text-green-500" />
            </div>
          </Link>
          <div className={`card ${summary.occupancyRate < 50 ? 'border-red-200 bg-red-50' : summary.occupancyRate < 80 ? 'border-yellow-200 bg-yellow-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-neutral-500">Occupancy Rate</div>
                <div className="mt-1 text-2xl font-semibold">{summary.occupancyRate}%</div>
              </div>
              <FiTrendingUp className={`h-8 w-8 ${summary.occupancyRate < 50 ? 'text-red-500' : summary.occupancyRate < 80 ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
          </div>
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
                        <strong>{summary.newInquiriesCount}</strong> new inquiry{summary.newInquiriesCount > 1 ? 's' : ''} waiting for response
                      </span>
                      <Link href={`/operator/inquiries${selected ? `?operatorId=${selected}` : ''}`} className="text-amber-900 hover:underline font-medium">
                        View →
                      </Link>
                    </div>
                  )}
                  {summary.expiringLicenses.length > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800">
                        <strong>{summary.expiringLicenses.length}</strong> license{summary.expiringLicenses.length > 1 ? 's' : ''} expiring within 30 days
                      </span>
                      <Link href={`/operator/compliance${selected ? `?operatorId=${selected}` : ''}`} className="text-amber-900 hover:underline font-medium">
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
            <Link 
              href={`/operator/homes/new${selected ? `?operatorId=${selected}` : ''}`}
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
            <Link 
              href={`/operator/residents/new${selected ? `?operatorId=${selected}` : ''}`}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-green-300 hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <div className="rounded-full bg-green-100 p-2">
                <FiPlus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-800">Add Resident</div>
                <div className="text-xs text-neutral-500">Onboard new resident</div>
              </div>
            </Link>
            <Link 
              href={`/operator/inquiries${selected ? `?operatorId=${selected}` : ''}`}
              className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="rounded-full bg-blue-100 p-2">
                <FiFileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-neutral-800">View Inquiries</div>
                <div className="text-xs text-neutral-500">Manage leads</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        {summary.recentInquiries.length > 0 && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-800">Recent Activity</h3>
              <Link href={`/operator/inquiries${selected ? `?operatorId=${selected}` : ''}`} className="text-sm text-primary-600 hover:underline">
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
                  <div className="rounded-full bg-blue-100 p-2 mt-1">
                    <FiFileText className="h-4 w-4 text-blue-600" />
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
                        inquiry.status === 'NEW' ? 'bg-red-100 text-red-700' :
                        inquiry.status === 'CONTACTED' ? 'bg-blue-100 text-blue-700' :
                        inquiry.status === 'TOUR_SCHEDULED' ? 'bg-yellow-100 text-yellow-700' :
                        inquiry.status === 'PLACEMENT_ACCEPTED' ? 'bg-green-100 text-green-700' :
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
          <a className="card hover:shadow-md transition" href={`/operator/homes${selected ? `?operatorId=${selected}` : ''}`}>
            <div className="text-lg font-medium">Manage Homes</div>
            <div className="text-sm text-neutral-500">Create, edit, and track homes</div>
          </a>
          <a className="card hover:shadow-md transition" href={`/operator/analytics${selected ? `?operatorId=${selected}` : ''}`}>
            <div className="text-lg font-medium">Analytics</div>
            <div className="text-sm text-neutral-500">Occupancy and funnel trends</div>
          </a>
          <a className="card hover:shadow-md transition" href={`/operator/compliance${selected ? `?operatorId=${selected}` : ''}`}>
            <div className="text-lg font-medium">Compliance</div>
            <div className="text-sm text-neutral-500">Licensing and inspections</div>
          </a>
          <a className="card hover:shadow-md transition" href={`/operator/billing${selected ? `?operatorId=${selected}` : ''}`}>
            <div className="text-lg font-medium">Billing</div>
            <div className="text-sm text-neutral-500">Deposits and monthly fees</div>
          </a>
        </div>
        </>
        )}
    </div>
  );
}
