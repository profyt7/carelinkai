import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { FiHome, FiUsers, FiTrendingUp, FiFileText, FiCreditCard, FiPlus, FiAlertCircle, FiClock } from "react-icons/fi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getSummary(userEmail?: string | null, operatorOverrideId?: string | null) {
  const user = userEmail
    ? await prisma.user.findUnique({ where: { email: userEmail } })
    : null;

  // Resolve operator (if user is OPERATOR). Admins may view global summary.
  const operator = user?.role === UserRole.OPERATOR
    ? await prisma.operator.findUnique({ where: { userId: user.id } })
    : null;

  const homeFilter = operatorOverrideId
    ? { operatorId: operatorOverrideId }
    : operator
      ? { operatorId: operator.id }
      : {};

  const [homes, inquiries, activeResidents, recentInquiries, expiringLicenses, newInquiriesCount] = await Promise.all([
    prisma.assistedLivingHome.count({ where: homeFilter }),
    prisma.inquiry.count({ where: Object.keys(homeFilter).length ? { home: homeFilter } : {} }),
    prisma.resident.count({ where: Object.keys(homeFilter).length ? { home: homeFilter, status: "ACTIVE" } : { status: "ACTIVE" } }),
    // Recent activity: last 5 inquiries
    prisma.inquiry.findMany({
      where: Object.keys(homeFilter).length ? { home: homeFilter } : {},
      include: {
        home: { select: { name: true } },
        family: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    // Expiring licenses (within 30 days)
    prisma.homeLicense.findMany({
      where: {
        home: homeFilter,
        expirationDate: {
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      include: {
        home: { select: { name: true } },
      },
      orderBy: { expirationDate: 'asc' },
      take: 5,
    }),
    // New inquiries count (status = NEW)
    prisma.inquiry.count({ 
      where: Object.keys(homeFilter).length 
        ? { home: homeFilter, status: 'NEW' } 
        : { status: 'NEW' } 
    }),
  ]);

  // Occupancy: sum currentOccupancy / sum capacity
  const capacityAgg = await prisma.assistedLivingHome.groupBy({
    by: ["operatorId"],
    where: homeFilter,
    _sum: { capacity: true, currentOccupancy: true },
  }).catch(() => [] as any[]);

  const totals = capacityAgg[0]?._sum || { capacity: 0, currentOccupancy: 0 };
  const occupancyRate = totals.capacity
    ? Math.round(((Number(totals.currentOccupancy || 0) / Number(totals.capacity)) * 100))
    : 0;

  return { 
    homes, 
    inquiries, 
    activeResidents, 
    occupancyRate,
    recentInquiries,
    expiringLicenses,
    newInquiriesCount,
  };
}

export default async function OperatorDashboardPage({ searchParams }: { searchParams?: { operatorId?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const operatorId = searchParams?.operatorId || null;

  // If ADMIN, allow scoping by operatorId from query; otherwise ignore
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  // Runtime mock toggle via cookie (set by /api/mock-mode or ?mock=1)
  const mockCookie = cookies().get("carelink_mock_mode")?.value?.toString().trim().toLowerCase() || "";
  const showMock = ["1","true","yes","on"].includes(mockCookie);

  const summary = showMock
    ? { 
        homes: 12, 
        inquiries: 7, 
        activeResidents: 38, 
        occupancyRate: 82,
        recentInquiries: [],
        expiringLicenses: [],
        newInquiriesCount: 3,
      }
    : await getSummary(email, user?.role === UserRole.ADMIN ? operatorId : null);

  // Load operators for admin filter UI
  const operators = user?.role === UserRole.ADMIN
    ? await prisma.operator.findMany({
        orderBy: { companyName: 'asc' },
        select: { id: true, companyName: true },
      })
    : [];
  const selected = operatorId || null;
  const selectedName = selected ? operators.find(o => o.id === selected)?.companyName || 'Unknown Operator' : 'All Operators';

  return (
    <div className="p-4 sm:p-6 space-y-6">
        {/* Admin operator scope selector */}
        {!showMock && user?.role === UserRole.ADMIN && (
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
      </div>
  );
}
