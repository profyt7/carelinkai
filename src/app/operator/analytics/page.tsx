import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PrismaClient, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const whereHome = op ? { operatorId: op.id } : {};

  const homes = await prisma.assistedLivingHome.findMany({ where: whereHome });
  const totalCapacity = homes.reduce((s, h) => s + h.capacity, 0);
  const totalOcc = homes.reduce((s, h) => s + h.currentOccupancy, 0);
  const occupancyRate = totalCapacity ? Math.round((totalOcc / totalCapacity) * 100) : 0;

  const inquiriesByStatus = await prisma.inquiry.groupBy({
    by: ['status'],
    where: op ? { home: { operatorId: op.id } } : {},
    _count: { _all: true },
  }).catch(() => [] as any[]);

  return (
    <DashboardLayout title="Analytics" showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card"><div className="text-sm text-neutral-500">Occupancy</div><div className="text-2xl font-semibold">{occupancyRate}%</div></div>
          <div className="card"><div className="text-sm text-neutral-500">Homes</div><div className="text-2xl font-semibold">{homes.length}</div></div>
          <div className="card"><div className="text-sm text-neutral-500">Total Capacity</div><div className="text-2xl font-semibold">{totalCapacity}</div></div>
        </div>

        <div className="card">
          <div className="font-medium mb-3">Inquiry Funnel</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {inquiriesByStatus.map((row) => (
              <div key={row.status} className="p-3 rounded-md bg-neutral-50 border border-neutral-200">
                <div className="text-xs text-neutral-500">{row.status}</div>
                <div className="text-lg font-semibold">{row._count?._all ?? 0}</div>
              </div>
            ))}
            {inquiriesByStatus.length === 0 && (
              <div className="text-neutral-600">No inquiries yet.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
