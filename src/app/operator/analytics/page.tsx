import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Breadcrumbs from "@/components/ui/breadcrumbs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OperatorAnalyticsPage({ searchParams }: { searchParams?: { operatorId?: string, range?: string, export?: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;

  // Resolve operator scope
  const isAdmin = user?.role === UserRole.ADMIN;
  const operatorOverrideId = isAdmin ? (searchParams?.operatorId || null) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const effectiveOperatorId = operatorOverrideId || op?.id || null;

  // Register chart.js on server to avoid RSC warnings; charts render on client chunks
  try { ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement); } catch {}

  const range = (searchParams as any)?.range || '30d';
  const now = new Date();
  const since = new Date(now);
  if (range === '7d') since.setDate(now.getDate() - 7);
  else if (range === '90d') since.setDate(now.getDate() - 90);
  else since.setDate(now.getDate() - 30);

  const homes = await prisma.assistedLivingHome.findMany({ where: effectiveOperatorId ? { operatorId: effectiveOperatorId } : {} });
  const totalCapacity = homes.reduce((s, h) => s + h.capacity, 0);
  const totalOcc = homes.reduce((s, h) => s + h.currentOccupancy, 0);
  const occupancyRate = totalCapacity ? Math.round((totalOcc / totalCapacity) * 100) : 0;

  const inquiriesByStatus = await prisma.inquiry
    .groupBy({
      by: ["status"],
      where: {
        ...(effectiveOperatorId ? { home: { operatorId: effectiveOperatorId } } : {}),
        createdAt: { gte: since }
      },
      _count: { _all: true },
    })
    .catch(() => [] as any[]);

  // Load operators for admin scope selector
  const operators = isAdmin
    ? await prisma.operator.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } })
    : [];
  const selected = effectiveOperatorId || "";
  const selectedName = selected
    ? operators.find((o) => o.id === selected)?.companyName || "Unknown Operator"
    : "All Operators";

  const donutData = {
    labels: ["Occupied", "Vacant"],
    datasets: [
      {
        data: [totalOcc, Math.max(totalCapacity - totalOcc, 0)],
        backgroundColor: ["#26c777", "#e2e8f0"],
        borderWidth: 0,
      },
    ],
  } as const;

  const funnelStatuses = [
    'NEW', 'CONTACTED', 'TOUR_SCHEDULED', 'TOUR_COMPLETED', 'PLACEMENT_OFFERED', 'PLACEMENT_ACCEPTED', 'CLOSED_LOST'
  ];
  const funnelCounts = funnelStatuses.map(s => inquiriesByStatus.find((r: any) => r.status === s)?._count?._all ?? 0);
  const funnelData = {
    labels: funnelStatuses,
    datasets: [{
      label: 'Inquiries',
      data: funnelCounts,
      backgroundColor: '#0099e6'
    }]
  } as const;

  // CSV export for inquiries by status (current range and scope)
  if ((searchParams as any)?.export === 'inquiries.csv') {
    const rows = [['Status', 'Count'] as string[]].concat(
      funnelStatuses.map((s, i) => [s, String(funnelCounts[i])])
    );
    const csv = rows.map(r => r.map(v => '"' + v.replaceAll('"', '""') + '"').join(',')).join('\n');
    return new Response(csv, {
      headers: {
        'content-type': 'text/csv',
        'content-disposition': 'attachment; filename="inquiries.csv"'
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
        <Breadcrumbs items={[
          { label: 'Operator', href: '/operator' },
          { label: 'Analytics' }
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card">
            <div className="text-sm text-neutral-500">Occupancy</div>
            <div className="mt-2 flex items-center gap-4">
              <div className="donut-chart-container">
                {/* @ts-expect-error Server Component passing client chart */}
                <Doughnut data={donutData} options={{ cutout: '70%', plugins: { legend: { display: false } } }} />
                <div className="donut-chart-label">
                  <div className="donut-chart-value">{occupancyRate}%</div>
                  <div className="donut-chart-title">Occupied</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Homes</div>
                <div className="text-xl font-semibold">{homes.length}</div>
                <div className="text-xs text-neutral-500 mt-1">Capacity</div>
                <div className="text-xl font-semibold">{totalCapacity}</div>
              </div>
            </div>
          </div>
          <div className="card sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">Inquiry Funnel</div>
              <div className="text-xs text-neutral-500">Range: {range}</div>
            </div>
            <div className="chart-container">
              {/* @ts-expect-error Server Component passing client chart */}
              <Bar data={funnelData} options={{ plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }} />
            </div>
          </div>
        </div>

        <div className="card">
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="operatorId" value={selected} />
            <input type="hidden" name="range" value={range} />
            <button className="btn btn-secondary" name="export" value="inquiries.csv" type="submit">Export Inquiries CSV</button>
          </form>
        </div>
      </div>
  );
}
