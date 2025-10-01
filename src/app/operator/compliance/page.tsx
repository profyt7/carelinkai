import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { PrismaClient, UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const prisma = new PrismaClient();

export default async function OperatorCompliancePage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const op = user?.role === UserRole.OPERATOR ? await prisma.operator.findUnique({ where: { userId: user.id } }) : null;
  const whereHome = op ? { operatorId: op.id } : {};

  const [licenses, inspections] = await Promise.all([
    prisma.license.findMany({
      where: { home: whereHome },
      orderBy: { expirationDate: 'asc' },
      take: 20,
      include: { home: { select: { name: true } } },
    }),
    prisma.inspection.findMany({
      where: { home: whereHome },
      orderBy: { inspectionDate: 'desc' },
      take: 20,
      include: { home: { select: { name: true } } },
    }),
  ]);

  const today = new Date();
  const soon = new Date();
  soon.setMonth(soon.getMonth() + 2);

  return (
    <DashboardLayout title="Compliance" showSearch={false}>
      <div className="p-4 sm:p-6 space-y-6">
        <div className="card">
          <div className="font-medium mb-3">Licenses (expiring soon)</div>
          <div className="divide-y">
            {licenses.filter(l => new Date(l.expirationDate) <= soon).map((l) => (
              <div key={l.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{l.home.name} · {l.type}</div>
                  <div className="text-sm text-neutral-500">License #{l.licenseNumber}</div>
                </div>
                <div className={`text-sm ${new Date(l.expirationDate) < today ? 'text-red-600' : 'text-amber-600'}`}>
                  Expires {new Date(l.expirationDate).toLocaleDateString()}
                </div>
              </div>
            ))}
            {licenses.filter(l => new Date(l.expirationDate) <= soon).length === 0 && (
              <div className="py-3 text-neutral-600">No upcoming expirations.</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="font-medium mb-3">Recent Inspections</div>
          <div className="divide-y">
            {inspections.map((i) => (
              <div key={i.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{i.home.name} · {i.inspectionType}</div>
                  <div className="text-sm text-neutral-500">By {i.inspector}</div>
                </div>
                <div className="text-sm text-neutral-700">
                  {new Date(i.inspectionDate).toLocaleDateString()} · {i.result}
                </div>
              </div>
            ))}
            {inspections.length === 0 && (
              <div className="py-3 text-neutral-600">No inspections on record.</div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
