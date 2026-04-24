import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { PrismaClient, UserRole } from "@prisma/client";
import AnalyticsCharts from "./AnalyticsCharts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

const FUNNEL_STATUSES = [
  'NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'TOUR_COMPLETED',
  'PLACEMENT_OFFERED', 'PLACEMENT_ACCEPTED', 'CLOSED_LOST',
];

export default async function OperatorAnalyticsPage({
  searchParams,
}: {
  searchParams?: { operatorId?: string; range?: string };
}) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  const isAdmin = user?.role === UserRole.ADMIN;
  const operatorOverrideId = isAdmin ? (searchParams?.operatorId || null) : null;
  const op = user?.role === UserRole.OPERATOR
    ? await prisma.operator.findUnique({ where: { userId: user.id } })
    : null;
  const effectiveOperatorId = operatorOverrideId || op?.id || null;

  const range = searchParams?.range || '30d';
  const now = new Date();
  const since = new Date(now);
  if (range === '7d') since.setDate(now.getDate() - 7);
  else if (range === '90d') since.setDate(now.getDate() - 90);
  else since.setDate(now.getDate() - 30);

  const homes = await prisma.assistedLivingHome.findMany({
    where: effectiveOperatorId ? { operatorId: effectiveOperatorId } : {},
  });
  const totalCapacity = homes.reduce((s, h) => s + h.capacity, 0);
  const totalOcc = homes.reduce((s, h) => s + h.currentOccupancy, 0);
  const occupancyRate = totalCapacity ? Math.round((totalOcc / totalCapacity) * 100) : 0;

  const inquiriesByStatus = await prisma.inquiry
    .groupBy({
      by: ["status"],
      where: {
        ...(effectiveOperatorId ? { home: { operatorId: effectiveOperatorId } } : {}),
        createdAt: { gte: since },
      },
      _count: { _all: true },
    })
    .catch(() => [] as any[]);

  const funnelCounts = FUNNEL_STATUSES.map(
    (s) => inquiriesByStatus.find((r: any) => r.status === s)?._count?._all ?? 0
  );

  const operators = isAdmin
    ? await prisma.operator.findMany({
        orderBy: { companyName: "asc" },
        select: { id: true, companyName: true },
      })
    : [];
  const selected = effectiveOperatorId || "";
  const selectedName = selected
    ? operators.find((o) => o.id === selected)?.companyName || "Unknown Operator"
    : "All Operators";

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <Breadcrumbs items={[
        { label: 'Operator', href: '/operator' },
        { label: 'Analytics' },
      ]} />

      {isAdmin && (
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="text-sm text-neutral-500">Viewing scope</div>
              <div className="text-lg font-medium">{selectedName}</div>
            </div>
            <form method="GET" className="flex items-center gap-2">
              <label className="text-sm text-neutral-600" htmlFor="operatorId">Operator</label>
              <select id="operatorId" name="operatorId" defaultValue={selected} className="form-select">
                <option value="">All Operators</option>
                {operators.map((o) => (
                  <option key={o.id} value={o.id}>{o.companyName}</option>
                ))}
              </select>
              <label className="text-sm text-neutral-600 ml-3" htmlFor="range">Range</label>
              <select id="range" name="range" defaultValue={range} className="form-select">
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="btn btn-secondary" type="submit">Apply</button>
            </form>
          </div>
        </div>
      )}

      <AnalyticsCharts
        occupancyRate={occupancyRate}
        totalOcc={totalOcc}
        totalCapacity={totalCapacity}
        homesCount={homes.length}
        funnelStatuses={FUNNEL_STATUSES}
        funnelCounts={funnelCounts}
        range={range}
      />

      <div className="card">
        <form action="/api/operator/analytics/export" method="GET">
          <input type="hidden" name="operatorId" value={selected} />
          <input type="hidden" name="range" value={range} />
          <button className="btn btn-secondary" type="submit">Export Inquiries CSV</button>
        </form>
      </div>
    </div>
  );
}
