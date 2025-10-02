import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PrismaClient, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

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

  const [homes, inquiries, activeResidents] = await Promise.all([
    prisma.assistedLivingHome.count({ where: homeFilter }),
    prisma.inquiry.count({ where: Object.keys(homeFilter).length ? { home: homeFilter } : {} }),
    prisma.resident.count({ where: Object.keys(homeFilter).length ? { home: homeFilter, status: "ACTIVE" } : { status: "ACTIVE" } }),
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

  return { homes, inquiries, activeResidents, occupancyRate };
}

export default async function OperatorDashboardPage({ searchParams }: { searchParams?: { operatorId?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const operatorId = searchParams?.operatorId || null;

  // If ADMIN, allow scoping by operatorId from query; otherwise ignore
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  const summary = await getSummary(email, user?.role === UserRole.ADMIN ? operatorId : null);

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
    <DashboardLayout title="Operator Dashboard" showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Admin operator scope selector */}
        {user?.role === UserRole.ADMIN && (
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
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="text-sm text-neutral-500">Homes</div>
            <div className="mt-1 text-2xl font-semibold">{summary.homes}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-500">Open Inquiries</div>
            <div className="mt-1 text-2xl font-semibold">{summary.inquiries}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-500">Active Residents</div>
            <div className="mt-1 text-2xl font-semibold">{summary.activeResidents}</div>
          </div>
          <div className="card">
            <div className="text-sm text-neutral-500">Occupancy</div>
            <div className="mt-1 text-2xl font-semibold">{summary.occupancyRate}%</div>
          </div>
        </div>

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
    </DashboardLayout>
  );
}
